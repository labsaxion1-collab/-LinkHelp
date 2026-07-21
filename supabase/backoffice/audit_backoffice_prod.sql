-- =============================================================================
-- audit_backoffice_prod.sql
-- Read-only inventory before BackOffice P0 foundation.
-- Run in staging/prod SQL editor — compare output before apply_backoffice_foundation.sql
-- =============================================================================

select 'admin_roles table pre-apply' as check_name,
  to_regclass('public.admin_roles') is not null as exists;

select 'admin_audit_logs table pre-apply' as check_name,
  to_regclass('public.admin_audit_logs') is not null as exists;

select 'existing flux admins (auth.users)' as label,
  id,
  email,
  raw_app_meta_data->>'role' as app_role
from auth.users
where coalesce(raw_app_meta_data->>'role', '') in ('admin', 'flux_admin');

select p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as args
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname like 'admin_%'
order by p.proname;

select 'admin_adjust_helper_credits grants' as check_name,
  has_function_privilege('authenticated', 'public.admin_adjust_helper_credits(uuid,integer,text)', 'execute') as authenticated_can_execute;
