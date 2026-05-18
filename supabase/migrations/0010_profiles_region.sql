-- Province/state/region label for profiles (e.g. QC). Prefer this over legacy province column.
alter table public.profiles add column if not exists region text;

create index if not exists profiles_region_idx on public.profiles (region);
