-- Request timezone (browser IANA) + internal market signals for matching/pricing

alter table public.requests
  add column if not exists timezone text,
  add column if not exists created_timezone text;

comment on column public.requests.timezone is 'IANA timezone at publish (e.g. America/Toronto)';
comment on column public.requests.created_timezone is 'Alias / audit: timezone captured at creation';

create table if not exists public.request_market_signals (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  helper_id uuid references public.profiles (id) on delete set null,
  signal text not null check (signal in ('ignore', 'interest', 'applied', 'hired')),
  category text,
  city text,
  budget_min numeric,
  budget_max numeric,
  distance_km numeric,
  created_at timestamptz not null default now()
);

create index if not exists request_market_signals_request_idx
  on public.request_market_signals (request_id, created_at desc);

create index if not exists request_market_signals_category_idx
  on public.request_market_signals (category, signal);

alter table public.request_market_signals enable row level security;

drop policy if exists request_market_signals_insert_authenticated
  on public.request_market_signals;

create policy request_market_signals_insert_authenticated
  on public.request_market_signals
  for insert
  to authenticated
  with check (true);

drop policy if exists request_market_signals_select_service
  on public.request_market_signals;

create policy request_market_signals_select_service
  on public.request_market_signals
  for select
  to authenticated
  using (false);
