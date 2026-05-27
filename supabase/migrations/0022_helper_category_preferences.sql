alter table public.profiles
  add column if not exists primary_category text,
  add column if not exists secondary_categories text[] default '{}';

comment on column public.profiles.primary_category is
  'Helper main service category used for matching, filters and future smart notifications.';

comment on column public.profiles.secondary_categories is
  'Helper optional secondary service categories used for matching, filters and future ranking.';
