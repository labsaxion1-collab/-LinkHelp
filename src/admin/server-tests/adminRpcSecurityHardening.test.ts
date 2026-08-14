import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  new URL('../../../supabase/migrations/0057_admin_rpc_security_hardening.sql', import.meta.url),
  'utf8',
);

const permissionFn = 'public.admin_user_has_permission(uuid, text)';
const auditFn = 'public.admin_write_audit_log(uuid, text, text, text, jsonb, jsonb, text, uuid, jsonb)';

describe('0057 admin RPC security hardening SQL', () => {
  it('keeps the exact admin helper signatures and server behavior', () => {
    expect(sql).toContain('create or replace function public.admin_user_has_permission(p_user_id uuid, p_permission text)');
    expect(sql).toContain('returns boolean');
    expect(sql).toContain('from public.admin_user_roles ur');
    expect(sql).toContain('join public.admin_role_permissions rp on rp.role_id = ur.role_id');
    expect(sql).toContain("ur.status = 'active'");
    expect(sql).toContain('rp.permission_id = p_permission');

    expect(sql).toContain('create or replace function public.admin_write_audit_log(');
    expect(sql).toContain('p_admin_id uuid');
    expect(sql).toContain('p_action text');
    expect(sql).toContain('p_target_type text default null');
    expect(sql).toContain('p_target_id text default null');
    expect(sql).toContain('p_before jsonb default null');
    expect(sql).toContain('p_after jsonb default null');
    expect(sql).toContain('p_reason text default null');
    expect(sql).toContain('p_correlation_id uuid default null');
    expect(sql).toContain("p_metadata jsonb default '{}'::jsonb");
    expect(sql).toContain('returns uuid');
    expect(sql).toContain('insert into public.admin_audit_logs');
  });

  it('uses SECURITY DEFINER with an empty search_path', () => {
    expect(sql).toContain('security definer');
    expect(sql).toContain("set search_path = ''");
  });

  it('revokes PUBLIC/anon/authenticated and grants service_role only', () => {
    expect(sql).toContain(`revoke all on function ${permissionFn} from public`);
    expect(sql).toContain(`revoke all on function ${permissionFn} from anon`);
    expect(sql).toContain(`revoke all on function ${permissionFn} from authenticated`);
    expect(sql).toContain(`grant execute on function ${permissionFn} to service_role`);

    expect(sql).toContain(`revoke all on function ${auditFn} from public`);
    expect(sql).toContain(`revoke all on function ${auditFn} from anon`);
    expect(sql).toContain(`revoke all on function ${auditFn} from authenticated`);
    expect(sql).toContain(`grant execute on function ${auditFn} to service_role`);

    expect(sql).not.toMatch(/grant execute on function public\.admin_user_has_permission\([^)]+\) to anon/i);
    expect(sql).not.toMatch(/grant execute on function public\.admin_user_has_permission\([^)]+\) to authenticated/i);
    expect(sql).not.toMatch(/grant execute on function public\.admin_write_audit_log\([^)]+\) to anon/i);
    expect(sql).not.toMatch(/grant execute on function public\.admin_write_audit_log\([^)]+\) to authenticated/i);
  });

  it('does not drop tables or grant frontend table access', () => {
    expect(sql).not.toMatch(/drop table|truncate|delete from/i);
    expect(sql).not.toMatch(/grant (select|insert|update|delete) on table/i);
  });
});
