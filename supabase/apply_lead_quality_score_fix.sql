-- LinkHelp: add requests.lead_quality_score if missing and repair dependent functions.
-- Safe to re-run (idempotent).
--
-- Root cause: migration 0031 was never applied to production.
-- The trigger trg_application_lead_quality calls refresh_request_lead_quality()
-- which tries to UPDATE requests SET lead_quality_score = ... and fails.
--
-- Run in Supabase Dashboard → SQL Editor (Production).

-- ---------------------------------------------------------------------------
-- 1. Column
-- ---------------------------------------------------------------------------

alter table public.requests
  add column if not exists lead_quality_score numeric not null default 0;

comment on column public.requests.lead_quality_score
  is 'Internal 0–100 score; not shown to end users.';

-- ---------------------------------------------------------------------------
-- 2. Scoring helper tables / columns (request_market_signals extras)
-- ---------------------------------------------------------------------------

alter table public.request_market_signals
  add column if not exists province text,
  add column if not exists distance_bucket text,
  add column if not exists source text,
  add column if not exists timezone text,
  add column if not exists event text;

-- ---------------------------------------------------------------------------
-- 3. compute_request_lead_quality
-- ---------------------------------------------------------------------------

create or replace function public.compute_request_lead_quality(p_request_id uuid)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_score numeric := 50;
  v_views  int;
  v_opens  int;
  v_apps   int;
  v_hired  int;
  v_cancelled int;
begin
  select
    count(*) filter (where signal = 'viewed')     into v_views
  from public.request_market_signals
  where request_id = p_request_id;

  select
    count(*) filter (where signal = 'opened')     into v_opens
  from public.request_market_signals
  where request_id = p_request_id;

  select
    count(*) filter (where signal in ('applied', 'proposal_sent')) into v_apps
  from public.request_market_signals
  where request_id = p_request_id;

  select
    count(*) filter (where signal = 'hired'),
    count(*) filter (where signal = 'cancelled')
  into v_hired, v_cancelled
  from public.request_market_signals
  where request_id = p_request_id;

  v_score := v_score + least(v_views, 30) * 0.4;
  v_score := v_score + least(v_opens, 20) * 0.8;
  v_score := v_score + least(v_apps, 10) * 1.5;

  if v_apps = 0 and v_views < 3 then
    v_score := v_score - 12;
  end if;

  if v_hired > 0 then
    v_score := v_score + 22;
  end if;

  if v_cancelled > 0 then
    v_score := v_score - 8;
  end if;

  return greatest(0, least(100, round(v_score)));
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. refresh_request_lead_quality
-- ---------------------------------------------------------------------------

create or replace function public.refresh_request_lead_quality(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.requests
  set lead_quality_score = public.compute_request_lead_quality(p_request_id)
  where id = p_request_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. trg_refresh_request_lead_quality (fires on request_market_signals insert)
-- ---------------------------------------------------------------------------

create or replace function public.trg_refresh_request_lead_quality()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_request_lead_quality(new.request_id);
  return new;
end;
$$;

drop trigger if exists trg_request_market_signals_lead_quality on public.request_market_signals;
create trigger trg_request_market_signals_lead_quality
  after insert on public.request_market_signals
  for each row
  execute function public.trg_refresh_request_lead_quality();

-- ---------------------------------------------------------------------------
-- 6. trg_application_lead_quality (fires on applications status update)
--    This is the trigger that was crashing on cancel.
-- ---------------------------------------------------------------------------

create or replace function public.trg_application_lead_quality()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event text;
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if new.status = 'accepted' then
      v_event := 'hired';
    elsif new.status = 'cancelled' then
      v_event := 'cancelled';
    else
      return new;
    end if;

    begin
      insert into public.request_market_signals (
        request_id, helper_id, signal, event, source, created_at
      ) values (
        new.request_id, new.helper_id, v_event, v_event, 'system', now()
      );
    exception when others then
      null; -- request_market_signals insert failure is non-fatal
    end;

    begin
      perform public.refresh_request_lead_quality(new.request_id);
    exception when others then
      null; -- lead quality update failure is non-fatal
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_applications_lead_quality on public.applications;
create trigger trg_applications_lead_quality
  after update of status on public.applications
  for each row
  execute function public.trg_application_lead_quality();

-- ---------------------------------------------------------------------------
-- 7. Backfill existing requests (safe; no-op if already scored)
-- ---------------------------------------------------------------------------

update public.requests
set lead_quality_score = public.compute_request_lead_quality(id)
where lead_quality_score = 0;

notify pgrst, 'reload schema';
