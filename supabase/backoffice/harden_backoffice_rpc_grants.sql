-- =============================================================================
-- harden_backoffice_rpc_grants.sql
-- BackOffice P0 — restrict foundation RPC EXECUTE to service_role only.
-- Idempotent. Does NOT CREATE OR REPLACE functions, tables, or data.
-- Does NOT touch legacy admin_* dashboard/credit RPCs.
-- =============================================================================

do $$
begin
  if to_regprocedure('public.admin_user_has_permission(uuid,text)') is null then
    raise exception 'BackOffice hardening aborted: missing admin_user_has_permission(uuid,text)';
  end if;
  if to_regprocedure('public.admin_write_audit_log(uuid,text,text,text,jsonb,jsonb,text,uuid,jsonb)') is null then
    raise exception 'BackOffice hardening aborted: missing admin_write_audit_log(uuid,text,text,text,jsonb,jsonb,text,uuid,jsonb)';
  end if;
  if to_regprocedure('public.admin_list_users(text,text,text,integer,integer)') is null then
    raise exception 'BackOffice hardening aborted: missing admin_list_users(text,text,text,integer,integer)';
  end if;
  if to_regprocedure('public.admin_get_user_detail(uuid)') is null then
    raise exception 'BackOffice hardening aborted: missing admin_get_user_detail(uuid)';
  end if;
  if to_regprocedure('public.admin_list_requests(text,text,integer,integer)') is null then
    raise exception 'BackOffice hardening aborted: missing admin_list_requests(text,text,integer,integer)';
  end if;
  if to_regprocedure('public.admin_get_request_detail(uuid)') is null then
    raise exception 'BackOffice hardening aborted: missing admin_get_request_detail(uuid)';
  end if;
  if to_regprocedure('public.admin_list_credit_transactions(uuid,text,integer,integer)') is null then
    raise exception 'BackOffice hardening aborted: missing admin_list_credit_transactions(uuid,text,integer,integer)';
  end if;
  if to_regprocedure('public.admin_list_audit_logs(uuid,text,integer,integer)') is null then
    raise exception 'BackOffice hardening aborted: missing admin_list_audit_logs(uuid,text,integer,integer)';
  end if;
end $$;

-- admin_user_has_permission(p_user_id uuid, p_permission text)
revoke all on function public.admin_user_has_permission(uuid, text) from public;
revoke all on function public.admin_user_has_permission(uuid, text) from anon;
revoke all on function public.admin_user_has_permission(uuid, text) from authenticated;
grant execute on function public.admin_user_has_permission(uuid, text) to service_role;

-- admin_write_audit_log(9-arg identity signature)
revoke all on function public.admin_write_audit_log(uuid, text, text, text, jsonb, jsonb, text, uuid, jsonb) from public;
revoke all on function public.admin_write_audit_log(uuid, text, text, text, jsonb, jsonb, text, uuid, jsonb) from anon;
revoke all on function public.admin_write_audit_log(uuid, text, text, text, jsonb, jsonb, text, uuid, jsonb) from authenticated;
grant execute on function public.admin_write_audit_log(uuid, text, text, text, jsonb, jsonb, text, uuid, jsonb) to service_role;

-- admin_list_users(p_role, p_search, p_city, p_limit, p_offset)
revoke all on function public.admin_list_users(text, text, text, integer, integer) from public;
revoke all on function public.admin_list_users(text, text, text, integer, integer) from anon;
revoke all on function public.admin_list_users(text, text, text, integer, integer) from authenticated;
grant execute on function public.admin_list_users(text, text, text, integer, integer) to service_role;

-- admin_get_user_detail(p_user_id uuid)
revoke all on function public.admin_get_user_detail(uuid) from public;
revoke all on function public.admin_get_user_detail(uuid) from anon;
revoke all on function public.admin_get_user_detail(uuid) from authenticated;
grant execute on function public.admin_get_user_detail(uuid) to service_role;

-- admin_list_requests(p_status, p_search, p_limit, p_offset)
revoke all on function public.admin_list_requests(text, text, integer, integer) from public;
revoke all on function public.admin_list_requests(text, text, integer, integer) from anon;
revoke all on function public.admin_list_requests(text, text, integer, integer) from authenticated;
grant execute on function public.admin_list_requests(text, text, integer, integer) to service_role;

-- admin_get_request_detail(p_request_id uuid)
revoke all on function public.admin_get_request_detail(uuid) from public;
revoke all on function public.admin_get_request_detail(uuid) from anon;
revoke all on function public.admin_get_request_detail(uuid) from authenticated;
grant execute on function public.admin_get_request_detail(uuid) to service_role;

-- admin_list_credit_transactions(p_helper_id, p_type, p_limit, p_offset)
revoke all on function public.admin_list_credit_transactions(uuid, text, integer, integer) from public;
revoke all on function public.admin_list_credit_transactions(uuid, text, integer, integer) from anon;
revoke all on function public.admin_list_credit_transactions(uuid, text, integer, integer) from authenticated;
grant execute on function public.admin_list_credit_transactions(uuid, text, integer, integer) to service_role;

-- admin_list_audit_logs(p_admin_id, p_action, p_limit, p_offset)
revoke all on function public.admin_list_audit_logs(uuid, text, integer, integer) from public;
revoke all on function public.admin_list_audit_logs(uuid, text, integer, integer) from anon;
revoke all on function public.admin_list_audit_logs(uuid, text, integer, integer) from authenticated;
grant execute on function public.admin_list_audit_logs(uuid, text, integer, integer) to service_role;

notify pgrst, 'reload schema';
