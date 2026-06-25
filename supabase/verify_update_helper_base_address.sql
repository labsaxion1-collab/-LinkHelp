-- =============================================================================
-- verify_update_helper_base_address.sql
-- Read-only checks after apply_update_helper_base_address.sql
-- =============================================================================

-- 1) Base address columns on profiles
select 'profiles.helper_base_address column' as check_name,
       exists (
         select 1
         from information_schema.columns
         where table_schema = 'public'
           and table_name = 'profiles'
           and column_name = 'helper_base_address'
       ) as ok;

select 'profiles.helper_base_city column' as check_name,
       exists (
         select 1
         from information_schema.columns
         where table_schema = 'public'
           and table_name = 'profiles'
           and column_name = 'helper_base_city'
       ) as ok;

select 'profiles.helper_base_province column' as check_name,
       exists (
         select 1
         from information_schema.columns
         where table_schema = 'public'
           and table_name = 'profiles'
           and column_name = 'helper_base_province'
       ) as ok;

select 'profiles.helper_base_postal_code column' as check_name,
       exists (
         select 1
         from information_schema.columns
         where table_schema = 'public'
           and table_name = 'profiles'
           and column_name = 'helper_base_postal_code'
       ) as ok;

select 'profiles.helper_base_lat column' as check_name,
       exists (
         select 1
         from information_schema.columns
         where table_schema = 'public'
           and table_name = 'profiles'
           and column_name = 'helper_base_lat'
       ) as ok;

select 'profiles.helper_base_lng column' as check_name,
       exists (
         select 1
         from information_schema.columns
         where table_schema = 'public'
           and table_name = 'profiles'
           and column_name = 'helper_base_lng'
       ) as ok;

select 'profiles.helper_base_updated_at column' as check_name,
       exists (
         select 1
         from information_schema.columns
         where table_schema = 'public'
           and table_name = 'profiles'
           and column_name = 'helper_base_updated_at'
       ) as ok;

-- 2) RPC exists with expected signature
select 'update_helper_base_address function' as check_name,
       exists (
         select 1
         from pg_proc p
         join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public'
           and p.proname = 'update_helper_base_address'
           and pg_get_function_identity_arguments(p.oid) = 'p_address text, p_city text, p_province text, p_postal_code text, p_lat double precision, p_lng double precision'
       ) as ok;

-- 3) Grant execute to authenticated
select 'grant execute to authenticated' as check_name,
       exists (
         select 1
         from pg_proc p
         join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public'
           and p.proname = 'update_helper_base_address'
           and has_function_privilege('authenticated', p.oid, 'EXECUTE')
       ) as ok;

-- 4) Protect trigger exists
select 'profiles_protect_helper_base_fields trigger' as check_name,
       exists (
         select 1
         from pg_trigger t
         join pg_class c on c.oid = t.tgrelid
         join pg_namespace ns on ns.oid = c.relnamespace
         where ns.nspname = 'public'
           and c.relname = 'profiles'
           and t.tgname = 'profiles_protect_helper_base_fields'
           and not t.tgisinternal
       ) as ok;

-- 5) RPC security checks (informational — inspect function body)
select 'update_helper_base_address auth.uid check' as check_name,
       pg_get_functiondef(p.oid) ~* 'auth\.uid\(\)' as ok
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'update_helper_base_address'
limit 1;

select 'update_helper_base_address role helper check' as check_name,
       pg_get_functiondef(p.oid) ~* 'NOT_HELPER' as ok
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'update_helper_base_address'
limit 1;

-- 6) Helpers with base address configured (informational)
select 'helpers with base address set' as metric,
       count(*)::int as value
from public.profiles
where role = 'helper'
  and (
    coalesce(trim(helper_base_address), '') <> ''
    or coalesce(trim(helper_base_city), '') <> ''
  );

-- PASS CRITERIA:
--   all check_name rows above should have ok = true
--   After apply, save helper base address in the app and confirm F5 persistence.
