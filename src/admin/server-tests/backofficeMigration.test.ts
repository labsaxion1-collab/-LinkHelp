import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(new URL('../../../supabase/backoffice/apply_backoffice_foundation.sql', import.meta.url), 'utf8');

describe('backoffice foundation migration', () => {
  it('seeds five RBAC roles and maps legacy admins to super_admin', () => {
    expect(sql).toContain("'super_admin'");
    expect(sql).toContain("'operations_admin'");
    expect(sql).toContain("'finance_admin'");
    expect(sql).toContain("'support_agent'");
    expect(sql).toContain("'analyst_readonly'");
    expect(sql).toContain("in ('admin', 'flux_admin')");
  });

  it('creates read-only RPCs and audit log writer', () => {
    expect(sql).toContain('admin_list_users');
    expect(sql).toContain('admin_get_user_detail');
    expect(sql).toContain('admin_list_requests');
    expect(sql).toContain('admin_get_request_detail');
    expect(sql).toContain('admin_list_credit_transactions');
    expect(sql).toContain('admin_list_audit_logs');
    expect(sql).toContain('admin_write_audit_log');
  });

  it('does not expose auth password fields', () => {
    expect(sql).not.toMatch(/encrypted_password|password_hash|raw_user_meta_data->>'password'/i);
  });

  it('restricts RPC execution to service_role', () => {
    expect(sql).toContain('security definer');
    expect(sql).toContain('revoke all on function public.admin_list_users');
    expect(sql).toContain('grant execute on function public.admin_list_users');
    expect(sql).toContain('to service_role');
  });

  it('denies direct authenticated access to audit and support session tables', () => {
    expect(sql).toContain('admin_audit_logs_deny_all');
    expect(sql).toContain('admin_support_sessions_deny_all');
    expect(sql).toContain("for all to authenticated using (false)");
  });
});
