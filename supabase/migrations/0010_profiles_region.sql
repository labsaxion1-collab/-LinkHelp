-- State/province label for profiles (e.g. QC). Use `region`, not `province`.
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS region text;

create index if not exists profiles_region_idx on public.profiles (region);
