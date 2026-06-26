-- =============================================================================
-- verify_helper_category_preferences.sql
-- Read-only checks after apply_helper_category_preferences.sql
-- =============================================================================

-- 1) Columns exist on profiles
select 'profiles.primary_category column' as check_name,
       exists (
         select 1
         from information_schema.columns
         where table_schema = 'public'
           and table_name = 'profiles'
           and column_name = 'primary_category'
           and data_type = 'text'
       ) as ok;

select 'profiles.secondary_categories column' as check_name,
       exists (
         select 1
         from information_schema.columns
         where table_schema = 'public'
           and table_name = 'profiles'
           and column_name = 'secondary_categories'
           and udt_name = '_text'
       ) as ok;

-- 2) No NULL secondary_categories arrays (backfill applied)
select 'profiles.secondary_categories null count' as metric,
       count(*)::int as null_count,
       count(*) = 0 as ok
from public.profiles
where secondary_categories is null;

-- 3) Helpers with category preferences set (informational)
select 'helpers with primary_category' as metric,
       count(*)::int as helper_count
from public.profiles
where role = 'helper'
  and nullif(trim(coalesce(primary_category, '')), '') is not null;

select 'helpers with secondary_categories' as metric,
       count(*)::int as helper_count
from public.profiles
where role = 'helper'
  and coalesce(array_length(secondary_categories, 1), 0) > 0;

-- 4) Sample rows (limit 10)
select
  id,
  email,
  role,
  primary_category,
  secondary_categories,
  updated_at
from public.profiles
where role = 'helper'
  and (
    nullif(trim(coalesce(primary_category, '')), '') is not null
    or coalesce(array_length(secondary_categories, 1), 0) > 0
  )
order by updated_at desc nulls last
limit 10;
