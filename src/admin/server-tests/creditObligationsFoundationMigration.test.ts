import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const migrationsDir = new URL('../../../supabase/migrations/', import.meta.url);
const sql = readFileSync(new URL('0063_credit_obligations_foundation.sql', migrationsDir), 'utf8');

function obligationFnBody(): string {
  const start = sql.indexOf('create or replace function public.has_active_credit_obligation(');
  expect(start).toBeGreaterThan(-1);
  const asStart = sql.indexOf('as $$', start);
  const end = sql.indexOf('$$;', asStart + 5);
  expect(asStart).toBeGreaterThan(start);
  expect(end).toBeGreaterThan(asStart);
  return sql.slice(asStart + 5, end);
}

const helperBody = obligationFnBody();

describe('0063 credit obligations foundation migration', () => {
  it('creates credit_obligations with required columns and FKs', () => {
    expect(sql).toContain('create table if not exists public.credit_obligations');
    expect(sql).toContain('owner_user_id uuid not null references public.profiles');
    expect(sql).toContain('owner_role text not null');
    expect(sql).toContain('amount_original int not null');
    expect(sql).toContain('amount_paid int not null default 0');
    expect(sql).toContain('amount_outstanding int not null');
    expect(sql).toContain('request_id uuid references public.requests');
    expect(sql).toContain('application_id uuid references public.applications');
    expect(sql).toContain('tolerance_month date');
    expect(sql).toContain('idempotency_key text not null');
    expect(sql).toContain('metadata jsonb not null default');
    expect(sql).toContain('settled_at timestamptz');
    expect(sql).not.toContain('obligation_settlements');
  });

  it('enforces financial and lifecycle constraints idempotently', () => {
    expect(sql).toContain('credit_obligations_amount_original_pos_check');
    expect(sql).toContain('amount_original > 0');
    expect(sql).toContain('credit_obligations_amount_paid_nonneg_check');
    expect(sql).toContain('credit_obligations_amount_paid_le_original_check');
    expect(sql).toContain('amount_paid <= amount_original');
    expect(sql).toContain('credit_obligations_amount_outstanding_consistency_check');
    expect(sql).toContain('amount_outstanding = amount_original - amount_paid');
    expect(sql).toContain('credit_obligations_open_outstanding_pos_check');
    expect(sql).toContain("status <> 'open' or amount_outstanding > 0");
    expect(sql).toContain('credit_obligations_settled_zero_check');
    expect(sql).toContain('amount_outstanding = 0 and settled_at is not null');
    expect(sql).toMatch(/if not exists \(\s*select 1 from pg_constraint/);
  });

  it('ties owner_role to allowed reasons and required linkage columns', () => {
    expect(sql).toContain('credit_obligations_role_reason_compat_check');
    expect(sql).toContain("owner_role = 'client' and reason in ('REQUEST_CANCEL_FEE', 'REQUEST_ABANDON_FEE')");
    expect(sql).toContain("owner_role = 'helper' and reason = 'HIRE_ARREARS'");
    expect(sql).toContain('credit_obligations_reason_request_application_check');
    expect(sql).toContain("reason = 'HIRE_ARREARS' and application_id is not null");
    expect(sql).toContain("reason in ('REQUEST_CANCEL_FEE', 'REQUEST_ABANDON_FEE') and request_id is not null");
    expect(sql).toContain('credit_obligations_tolerance_month_reason_check');
    expect(sql).toContain('credit_obligations_tolerance_month_first_day_check');
    expect(sql).toContain("date_trunc('month', tolerance_month");
  });

  it('indexes owner, linkage, open obligations, tolerance and idempotency', () => {
    expect(sql).toContain('credit_obligations_idempotency_key_uidx');
    expect(sql).toContain('credit_obligations_owner_user_id_idx');
    expect(sql).toContain('credit_obligations_request_id_idx');
    expect(sql).toContain('credit_obligations_application_id_idx');
    expect(sql).toContain('credit_obligations_open_owner_idx');
    expect(sql).toContain('credit_obligations_helper_tolerance_month_idx');
    expect(sql).toContain("where status = 'open' and amount_outstanding > 0");
  });

  it('enables RLS with ownership SELECT only and revokes direct writes', () => {
    expect(sql).toContain('enable row level security');
    expect(sql).toContain('credit_obligations_select_own');
    expect(sql).toContain('(select auth.uid()) = owner_user_id');
    expect(sql).toContain('revoke all on table public.credit_obligations from public');
    expect(sql).toContain('revoke all on table public.credit_obligations from anon');
    expect(sql).toContain('grant select on table public.credit_obligations to authenticated');
    expect(sql).not.toMatch(/grant (insert|update|delete) on table public\.credit_obligations/i);
    expect(sql).not.toMatch(/for insert to authenticated/i);
  });

  it('exposes has_active_credit_obligation read helper without leaking other users', () => {
    expect(sql).toContain('create or replace function public.has_active_credit_obligation(');
    expect(sql).toContain("set search_path = ''");
    expect(sql).toContain('from public.credit_obligations');
    expect(helperBody).toContain('caller is distinct from p_owner_user_id');
    expect(helperBody).toContain("raise exception 'NOT_ALLOWED'");
    expect(helperBody).toContain("o.status = 'open'");
    expect(helperBody).toContain('o.amount_outstanding > 0');
    expect(sql).toContain('revoke all on function public.has_active_credit_obligation(uuid) from public');
    expect(sql).toContain('revoke all on function public.has_active_credit_obligation(uuid) from anon');
    expect(sql).toContain('grant execute on function public.has_active_credit_obligation(uuid) to authenticated');
    expect(sql).not.toMatch(/grant execute on function public\.has_active_credit_obligation\(uuid\) to anon/i);
  });

  it('does not grant/debit credits or create obligations during apply', () => {
    expect(sql).not.toMatch(/\binsert into public\.credit_obligations\b/i);
    expect(sql).not.toMatch(/\bupdate public\.(credit_wallets|profiles)\b/i);
    expect(sql).not.toMatch(/\binsert into public\.credit_transactions\b/i);
    expect(sql).not.toMatch(/client_cancel_request|process_request_expiry|confirm_stripe/i);
  });

  it('keeps exactly six Vercel API route handlers', () => {
    const routes = execSync('git ls-files api', { encoding: 'utf8' })
      .split(/\r?\n/)
      .filter((line) => line.endsWith('.ts') && !line.includes('/_lib/'));
    expect(routes.sort()).toEqual(
      [
        'api/admin/dashboard-summary.ts',
        'api/gamification/me.ts',
        'api/gamification/recalculate.ts',
        'api/stripe/create-checkout-session.ts',
        'api/stripe/create-client-checkout-session.ts',
        'api/stripe/webhook.ts',
      ].sort(),
    );
  });

  it('does not alter numbered migrations 0001–0062', () => {
    const changed = execSync('git diff --name-only HEAD -- supabase/migrations/', {
      encoding: 'utf8',
    })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((file) =>
        /supabase\/migrations\/(000[1-9]|00[1-4]\d|005[0-9]|006[012])_/.test(file.replaceAll('\\', '/')),
      );
    expect(changed).toEqual([]);
  });
});
