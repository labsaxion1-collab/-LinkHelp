import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(new URL('../../../supabase/migrations/0051_admin_dashboard_summary_rpc.sql', import.meta.url), 'utf8');

describe('0051 admin dashboard summary RPC migration', () => {
  it('returns aggregates only and reproduces current formulas', () => {
    expect(sql).toContain("count(*) filter (where status = 'open')");
    expect(sql).toContain("status in ('pending', 'viewed')");
    expect(sql).toContain("status = 'accepted'");
    expect(sql).toContain('coalesce(r.budget_max, r.budget_amount, r.budget_min)');
    expect(sql).toContain('selected_budget > 0');
    expect(sql).toContain('round(avg(selected_budget)');
    expect(sql).toContain("'[]'::jsonb");
  });

  it('does not return personal or individual-row fields', () => {
    expect(sql).not.toMatch(/client_id|helper_id|description|review|email|phone/i);
  });

  it('uses definer security and restricts execution to service_role', () => {
    expect(sql).toContain('security definer');
    expect(sql).toContain('set search_path =');
    expect(sql).toContain('revoke all on function public.admin_dashboard_summary() from public');
    expect(sql).toContain('revoke all on function public.admin_dashboard_summary() from anon');
    expect(sql).toContain('revoke all on function public.admin_dashboard_summary() from authenticated');
    expect(sql).toContain('grant execute on function public.admin_dashboard_summary() to service_role');
  });
});
