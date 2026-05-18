-- State/province label for profiles (e.g. QC). Use `region`, not `province`.
alter table public.profiles
  add column if not exists region text;

create index if not exists profiles_region_idx on public.profiles (region);
