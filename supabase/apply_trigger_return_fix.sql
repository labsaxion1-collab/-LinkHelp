-- LinkHelp: fix trigger functions missing RETURN on candidatura flow.
-- Run in Supabase Dashboard → SQL Editor (Production).
-- Safe to re-run (idempotent).
--
-- Symptom: helper_submit_application fails with
--   "control reached end of trigger procedure without RETURN"
-- Root cause: AFTER INSERT trigger on applications (or BEFORE UPDATE on
-- credit_wallets during debit) whose function body does not RETURN NEW/NULL.

create schema if not exists private;

-- ---------------------------------------------------------------------------
-- Core utility used by credit_wallets + applications updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- credit_wallets: BEFORE UPDATE (fires during helper_debit_application_interest)
-- ---------------------------------------------------------------------------
drop trigger if exists credit_wallets_set_updated_at on public.credit_wallets;
create trigger credit_wallets_set_updated_at
  before update on public.credit_wallets
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- applications: BEFORE UPDATE
-- ---------------------------------------------------------------------------
drop trigger if exists applications_set_updated_at on public.applications;
create trigger applications_set_updated_at
  before update on public.applications
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- applications: AFTER INSERT — first-application LinkCredits reward
-- ---------------------------------------------------------------------------
create or replace function public.linkhelp_grant_first_application_reward()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*)::int from public.applications where helper_id = new.helper_id) = 1 then
    perform public.grant_user_reward(
      new.helper_id,
      'FIRST_APPLICATION_SENT',
      null,
      'Primeira candidatura enviada'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists applications_first_reward on public.applications;
create trigger applications_first_reward
  after insert on public.applications
  for each row
  execute function public.linkhelp_grant_first_application_reward();

-- ---------------------------------------------------------------------------
-- applications: AFTER UPDATE — lead quality (hire / cancel)
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

-- ---------------------------------------------------------------------------
-- Push queue + application triggers (migration 0040)
-- ---------------------------------------------------------------------------
create table if not exists public.push_notification_queue (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null,
  title      text        not null,
  body       text        not null default '',
  url        text        not null default '/',
  created_at timestamptz not null default now()
);

alter table public.push_notification_queue enable row level security;

create or replace function private.enqueue_push(
  p_user_id uuid,
  p_title   text,
  p_body    text,
  p_url     text default '/'
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.push_notification_queue (user_id, title, body, url)
  values (p_user_id, p_title, p_body, p_url);
$$;

create or replace function private.trg_push_on_application_inserted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_helper_name text;
begin
  select name into v_helper_name from public.profiles where id = new.helper_id;

  perform private.enqueue_push(
    new.client_id,
    'Nova candidatura recebida',
    coalesce(v_helper_name, 'Um helper') || ' se candidatou ao seu pedido.',
    '/client/dashboard'
  );

  return new;
end;
$$;

drop trigger if exists push_on_application_inserted on public.applications;
create trigger push_on_application_inserted
  after insert on public.applications
  for each row
  execute function private.trg_push_on_application_inserted();

create or replace function private.trg_push_on_application_accepted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.enqueue_push(
    new.helper_id,
    'Proposta aceita',
    'Sua candidatura foi aceita. Veja os detalhes do job.',
    '/helper/jobs'
  );

  return new;
end;
$$;

drop trigger if exists push_on_application_accepted on public.applications;
create trigger push_on_application_accepted
  after update on public.applications
  for each row
  when (new.status = 'accepted' and old.status is distinct from new.status)
  execute function private.trg_push_on_application_accepted();

notify pgrst, 'reload schema';
