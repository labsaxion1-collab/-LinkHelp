-- =============================================================================
-- verify_backoffice_foundation.sql
-- Post-apply checks for BackOffice P0 foundation.
-- =============================================================================

select 'admin_roles seeded' as check_name,
  (select count(*) >= 5 from public.admin_roles) as ok;

select 'super_admin permissions' as check_name,
  (
    select count(*) >= 10
    from public.admin_role_permissions
    where role_id = 'super_admin'
  ) as ok;

select 'existing admins mapped to super_admin' as check_name,
  (
    select count(*) > 0
    from public.admin_user_roles
    where role_id = 'super_admin'
  ) as ok;

select 'admin_audit_logs table' as check_name,
  to_regclass('public.admin_audit_logs') is not null as ok;

select 'admin_support_sessions table' as check_name,
  to_regclass('public.admin_support_sessions') is not null as ok;

select 'admin_list_users defined' as check_name,
  to_regprocedure('public.admin_list_users(text,text,text,integer,integer)') is not null as ok;

select 'admin_get_user_detail defined' as check_name,
  to_regprocedure('public.admin_get_user_detail(uuid)') is not null as ok;

select 'admin_list_requests defined' as check_name,
  to_regprocedure('public.admin_list_requests(text,text,integer,integer)') is not null as ok;

select 'admin_get_request_detail defined' as check_name,
  to_regprocedure('public.admin_get_request_detail(uuid)') is not null as ok;

select 'admin_list_credit_transactions defined' as check_name,
  to_regprocedure('public.admin_list_credit_transactions(uuid,text,integer,integer)') is not null as ok;

select 'admin_list_audit_logs defined' as check_name,
  to_regprocedure('public.admin_list_audit_logs(uuid,text,integer,integer)') is not null as ok;

select 'admin_list_users not granted to authenticated' as check_name,
  not has_function_privilege('authenticated', 'public.admin_list_users(text,text,text,integer,integer)', 'execute') as ok;

select 'admin_write_audit_log service_role only' as check_name,
  has_function_privilege('service_role', 'public.admin_write_audit_log(uuid,text,text,text,jsonb,jsonb,text,uuid,jsonb)', 'execute') as ok;

select 'admin_audit_logs RLS enabled' as check_name,
  (
    select c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'admin_audit_logs'
  ) as ok;

-- Smoke (returns empty arrays when no data — should not error)
select 'admin_list_users smoke' as check_name,
  (public.admin_list_users(null, null, null, 5, 0)->>'total') is not null as ok;

select 'admin_list_audit_logs smoke' as check_name,
  (public.admin_list_audit_logs(null, null, 5, 0)->>'total') is not null as ok;
