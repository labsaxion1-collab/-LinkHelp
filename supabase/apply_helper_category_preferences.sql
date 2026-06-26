-- =============================================================================
-- apply_helper_category_preferences.sql
-- Helper category preference columns on profiles (migration 0022).
-- Idempotent — safe to run multiple times on production.
--
-- Frontend: src/pages/profile/ProfilePage.tsx (updateProfile primary/secondary)
--           src/utils/helperCategoryPreferences.ts
-- Prerequisite: public.profiles table exists (migration 0001+).
-- Does NOT alter credit_wallets, Stripe, onboarding, VIP/refund, or helper_skills.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Category preference columns
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists primary_category text,
  add column if not exists secondary_categories text[] default '{}';

comment on column public.profiles.primary_category is
  'Helper main service category used for matching, filters and future smart notifications.';

comment on column public.profiles.secondary_categories is
  'Helper optional secondary service categories used for matching, filters and future ranking.';

-- Backfill NULL arrays on rows created before default was applied.
update public.profiles
set secondary_categories = '{}'
where secondary_categories is null;

-- ---------------------------------------------------------------------------
-- 2) Post-apply sanity (definitions only — no data mutation)
-- ---------------------------------------------------------------------------
select
  'profiles.primary_category column' as check_name,
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'primary_category'
  ) as ok;

select
  'profiles.secondary_categories column' as check_name,
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'secondary_categories'
  ) as ok;

notify pgrst, 'reload schema';
