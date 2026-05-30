alter table public.profiles
  add column if not exists helper_base_address text,
  add column if not exists helper_base_city text,
  add column if not exists helper_base_province text,
  add column if not exists helper_base_postal_code text,
  add column if not exists helper_base_lat double precision,
  add column if not exists helper_base_lng double precision;

comment on column public.profiles.helper_base_address is
  'Helper fixed base address used for opportunity distance, ranking, matching, and LinkCredits cost.';

comment on column public.profiles.helper_base_lat is
  'Nullable latitude for helper fixed base address. Live GPS must not be used for LinkCredits pricing.';

comment on column public.profiles.helper_base_lng is
  'Nullable longitude for helper fixed base address. Live GPS must not be used for LinkCredits pricing.';
