-- Restrict admin helper RPCs to service_role. Does not change 0055.
-- CREATE OR REPLACE preserves server behavior; REVOKE anon/authenticated
-- because schema default privileges can re-grant EXECUTE after PUBLIC revoke.

create or replace function public.admin_user_has_permission(p_user_id uuid, p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_user_roles ur
    join public.admin_role_permissions rp on rp.role_id = ur.role_id
    where ur.user_id = p_user_id
      and ur.status = 'active'
      and rp.permission_id = p_permission
  );
$$;

create or replace function public.admin_write_audit_log(
  p_admin_id uuid,
  p_action text,
  p_target_type text default null,
  p_target_id text default null,
  p_before jsonb default null,
  p_after jsonb default null,
  p_reason text default null,
  p_correlation_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.admin_audit_logs (
    admin_id, action, target_type, target_id,
    before, after, reason, correlation_id, metadata
  ) values (
    p_admin_id, p_action, p_target_type, p_target_id,
    p_before, p_after, p_reason, p_correlation_id, coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.admin_user_has_permission(uuid, text) from public;
revoke all on function public.admin_user_has_permission(uuid, text) from anon;
revoke all on function public.admin_user_has_permission(uuid, text) from authenticated;
grant execute on function public.admin_user_has_permission(uuid, text) to service_role;

revoke all on function public.admin_write_audit_log(uuid, text, text, text, jsonb, jsonb, text, uuid, jsonb) from public;
revoke all on function public.admin_write_audit_log(uuid, text, text, text, jsonb, jsonb, text, uuid, jsonb) from anon;
revoke all on function public.admin_write_audit_log(uuid, text, text, text, jsonb, jsonb, text, uuid, jsonb) from authenticated;
grant execute on function public.admin_write_audit_log(uuid, text, text, text, jsonb, jsonb, text, uuid, jsonb) to service_role;
