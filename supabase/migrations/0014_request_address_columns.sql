-- Location + schedule columns for public.requests (safe if 0009 was not applied in production).
alter table public.requests
  add column if not exists address text,
  add column if not exists city text,
  add column if not exists region text,
  add column if not exists postal_code text,
  add column if not exists preferred_date date,
  add column if not exists preferred_time_window text,
  add column if not exists preferred_time text,
  add column if not exists budget_min numeric,
  add column if not exists budget_max numeric;

comment on column public.requests.address is 'Street line from Places / manual entry';
comment on column public.requests.postal_code is 'Postal or ZIP code when available';
comment on column public.requests.budget_min is 'Client budget range minimum (CAD)';
comment on column public.requests.budget_max is 'Client budget range maximum (CAD)';
