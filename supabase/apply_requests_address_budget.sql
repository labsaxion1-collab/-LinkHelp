-- Run this in the Supabase SQL editor if Vercel still reports:
-- PGRST204: Could not find the 'address' column of 'requests' in the schema cache.

alter table public.requests
  add column if not exists address text,
  add column if not exists city text,
  add column if not exists region text,
  add column if not exists postal_code text,
  add column if not exists latitude numeric,
  add column if not exists longitude numeric,
  add column if not exists preferred_date date,
  add column if not exists preferred_time_window text,
  add column if not exists preferred_time text,
  add column if not exists budget_type text default 'negotiable',
  add column if not exists budget_amount numeric,
  add column if not exists currency text default 'CAD';

notify pgrst, 'reload schema';
