-- Public pre-launch waitlist. Anonymous visitors may insert, but never read entries.
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  first_name text not null check (char_length(first_name) between 1 and 80),
  email text not null,
  city text not null check (char_length(city) between 1 and 120),
  user_type text not null check (user_type in ('client', 'helper', 'both')),
  language text not null default 'fr-CA',
  source text,
  campaign text,
  utm_medium text,
  referrer text,
  consent_marketing boolean not null default false check (consent_marketing = true),
  status text not null default 'waiting' check (status in ('waiting', 'invited', 'converted', 'unsubscribed')),
  created_at timestamptz not null default now()
);
create unique index if not exists waitlist_email_lower_uidx on public.waitlist (lower(email));
alter table public.waitlist enable row level security;
drop policy if exists waitlist_public_insert on public.waitlist;
create policy waitlist_public_insert on public.waitlist for insert to anon, authenticated
with check (consent_marketing = true and status = 'waiting' and language = 'fr-CA' and user_type in ('client', 'helper', 'both'));
revoke all on table public.waitlist from anon, authenticated;
grant insert on table public.waitlist to anon, authenticated;
comment on table public.waitlist is 'Pre-launch email waitlist; inserts are public, reads are service-role only.';
