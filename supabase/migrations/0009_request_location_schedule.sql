-- Extended request location and scheduling fields
alter table public.requests
  add column if not exists address text,
  add column if not exists city text,
  add column if not exists region text,
  add column if not exists preferred_date date,
  add column if not exists preferred_time_window text,
  add column if not exists preferred_time text;
