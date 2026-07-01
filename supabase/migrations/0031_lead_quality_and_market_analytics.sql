-- Lead quality persistence, expanded market signals, proposal analytics

alter table public.requests
  add column if not exists lead_quality_score numeric not null default 0;

comment on column public.requests.lead_quality_score is 'Internal 0-100 score; not shown to end users';

-- Expand market signals
alter table public.request_market_signals
  add column if not exists province text,
  add column if not exists distance_bucket text,
  add column if not exists source text,
  add column if not exists timezone text,
  add column if not exists event text;

-- Backfill event from legacy signal column
update public.request_market_signals
set event = case signal
  when 'ignore' then 'not_interested'
  when 'interest' then 'interested'
  when 'applied' then 'proposal_sent'
  when 'hired' then 'hired'
  else coalesce(signal, 'opened')
end
where event is null and signal is not null;

alter table public.request_market_signals drop constraint if exists request_market_signals_signal_check;

alter table public.request_market_signals
  drop constraint if exists request_market_signals_event_check;

alter table public.request_market_signals
  add constraint request_market_signals_event_check check (
    event is null
    or event in (
      'opened',
      'interested',
      'not_interested',
      'proposal_sent',
      'hired',
      'cancelled'
    )
  );

create index if not exists request_market_signals_event_idx
  on public.request_market_signals (event, created_at desc);

create index if not exists request_market_signals_city_idx
  on public.request_market_signals (city, province);

-- Internal score from signal aggregates + request metadata
create or replace function public.compute_request_lead_quality(p_request_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_score numeric := 48;
  v_interest int := 0;
  v_ignore int := 0;
  v_proposals int := 0;
  v_hired int := 0;
  v_cancelled int := 0;
  v_urgency text;
  v_budget_min numeric;
  v_budget_max numeric;
begin
  select
    count(*) filter (
      where coalesce(event, signal) in ('interested', 'interest', 'opened')
    ),
    count(*) filter (
      where coalesce(event, signal) in ('not_interested', 'ignore')
    ),
    count(*) filter (
      where coalesce(event, signal) in ('proposal_sent', 'applied')
    ),
    count(*) filter (where coalesce(event, signal) = 'hired'),
    count(*) filter (where coalesce(event, signal) = 'cancelled')
  into v_interest, v_ignore, v_proposals, v_hired, v_cancelled
  from public.request_market_signals
  where request_id = p_request_id;

  select urgency, budget_min, budget_max
  into v_urgency, v_budget_min, v_budget_max
  from public.requests
  where id = p_request_id;

  if v_budget_min is not null and v_budget_max is not null then
    v_score := v_score + 12;
  end if;

  if v_urgency = 'high' then
    v_score := v_score + 6;
  end if;

  if v_interest + v_proposals > 0 then
    v_score := v_score + least(18, (v_interest + v_proposals) * 3);
  end if;

  if v_ignore > greatest(v_interest, 1) then
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

-- Refresh on application lifecycle (hire / cancel)
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

    insert into public.request_market_signals (
      request_id, helper_id, signal, event, source, created_at
    ) values (
      new.request_id, new.helper_id, v_event, v_event, 'system', now()
    );

    perform public.refresh_request_lead_quality(new.request_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_applications_lead_quality on public.applications;
create trigger trg_applications_lead_quality
after update of status on public.applications
for each row
execute function public.trg_application_lead_quality();

-- Proposal modal analytics
create table if not exists public.helper_proposal_analytics (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  helper_id uuid references public.profiles (id) on delete set null,
  event text not null check (
    event in ('opened', 'closed', 'cancelled', 'submitted')
  ),
  source text check (
    source is null
    or source in ('swipe', 'modal', 'details', 'recommendation')
  ),
  proposed_amount numeric,
  budget_min numeric,
  budget_max numeric,
  duration_ms integer,
  timezone text,
  created_at timestamptz not null default now()
);

create index if not exists helper_proposal_analytics_request_idx
  on public.helper_proposal_analytics (request_id, created_at desc);

create index if not exists helper_proposal_analytics_helper_idx
  on public.helper_proposal_analytics (helper_id, created_at desc);

alter table public.helper_proposal_analytics enable row level security;

drop policy if exists helper_proposal_analytics_insert on public.helper_proposal_analytics;
create policy helper_proposal_analytics_insert
  on public.helper_proposal_analytics
  for insert
  to authenticated
  with check (auth.uid() = helper_id or helper_id is null);

drop policy if exists helper_proposal_analytics_select_denied on public.helper_proposal_analytics;
create policy helper_proposal_analytics_select_denied
  on public.helper_proposal_analytics
  for select
  to authenticated
  using (false);

-- Refresh lead score when request expires / cancels
create or replace function public.trg_request_status_lead_quality()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status
     and new.status in ('cancelled', 'completed') then
    insert into public.request_market_signals (
      request_id, signal, event, source, created_at
    ) values (
      new.id,
      case when new.status = 'cancelled' then 'cancelled' else 'cancelled' end,
      'cancelled',
      'system',
      now()
    );
    perform public.refresh_request_lead_quality(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_requests_status_lead_quality on public.requests;
create trigger trg_requests_status_lead_quality
after update of status on public.requests
for each row
execute function public.trg_request_status_lead_quality();
