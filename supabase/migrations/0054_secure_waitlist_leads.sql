-- Secure pre-launch leads. Browser clients have no direct table access.
create extension if not exists citext with schema extensions;

create table if not exists public.waitlist_leads (
  id uuid primary key default gen_random_uuid(),
  first_name text not null check (char_length(first_name) between 1 and 80),
  email extensions.citext not null,
  city text check (city is null or char_length(city) between 1 and 120),
  interest_type text not null check (interest_type in ('client', 'helper', 'both')),
  marketing_consent boolean not null default false,
  marketing_consent_at timestamptz,
  source text not null default 'landing_page' check (char_length(source) between 1 and 80),
  utm_source text check (utm_source is null or char_length(utm_source) <= 160),
  utm_medium text check (utm_medium is null or char_length(utm_medium) <= 160),
  utm_campaign text check (utm_campaign is null or char_length(utm_campaign) <= 200),
  utm_content text check (utm_content is null or char_length(utm_content) <= 200),
  utm_term text check (utm_term is null or char_length(utm_term) <= 200),
  locale text not null default 'fr-CA' check (char_length(locale) between 2 and 20),
  converted_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint waitlist_leads_consent_timestamp_check check (
    (marketing_consent and marketing_consent_at is not null)
    or (not marketing_consent and marketing_consent_at is null)
  )
);

create unique index if not exists waitlist_leads_email_uidx
  on public.waitlist_leads (email);

drop trigger if exists waitlist_leads_set_updated_at on public.waitlist_leads;
create trigger waitlist_leads_set_updated_at
  before update on public.waitlist_leads
  for each row execute function public.set_updated_at();

alter table public.waitlist_leads enable row level security;
revoke all on table public.waitlist_leads from anon, authenticated;

comment on table public.waitlist_leads is
  'Private pre-launch leads. Only trusted server-side code may read or write rows.';
comment on column public.waitlist_leads.converted_user_id is
  'Reserved for a future waitlist lead to LinkHelp user conversion.';

-- Preserve any leads collected by the former browser-direct implementation.
insert into public.waitlist_leads (
  first_name, email, city, interest_type, marketing_consent,
  marketing_consent_at, source, utm_source, utm_medium, utm_campaign,
  locale, created_at, updated_at
)
select
  trim(first_name), lower(trim(email))::extensions.citext, nullif(trim(city), ''),
  user_type, consent_marketing,
  case when consent_marketing then created_at else null end,
  'landing_page', nullif(source, ''), nullif(utm_medium, ''), nullif(campaign, ''),
  coalesce(nullif(language, ''), 'fr-CA'), created_at, created_at
from public.waitlist
where trim(first_name) <> '' and trim(email) <> ''
on conflict (email) do nothing;

-- Retire public writes to the legacy table. It remains available for audit/migration.
drop policy if exists waitlist_public_insert on public.waitlist;
revoke all on table public.waitlist from anon, authenticated;

-- Private, hashed rate-limit buckets used only by the Edge Function.
create table if not exists public.waitlist_rate_limits (
  rate_key text primary key,
  window_started_at timestamptz not null default now(),
  attempt_count integer not null default 1 check (attempt_count > 0),
  updated_at timestamptz not null default now()
);

alter table public.waitlist_rate_limits enable row level security;
revoke all on table public.waitlist_rate_limits from anon, authenticated;

create or replace function public.check_waitlist_rate_limit(
  p_key text,
  p_limit integer default 8,
  p_window_seconds integer default 900
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
begin
  if p_key is null or char_length(p_key) < 16 or p_limit < 1 or p_window_seconds < 1 then
    return false;
  end if;

  insert into public.waitlist_rate_limits as limits (
    rate_key, window_started_at, attempt_count, updated_at
  ) values (p_key, now(), 1, now())
  on conflict (rate_key) do update set
    window_started_at = case
      when limits.window_started_at <= now() - make_interval(secs => p_window_seconds)
      then now() else limits.window_started_at end,
    attempt_count = case
      when limits.window_started_at <= now() - make_interval(secs => p_window_seconds)
      then 1 else limits.attempt_count + 1 end,
    updated_at = now()
  returning attempt_count into v_count;

  return v_count <= p_limit;
end;
$$;

revoke all on function public.check_waitlist_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_waitlist_rate_limit(text, integer, integer) to service_role;
