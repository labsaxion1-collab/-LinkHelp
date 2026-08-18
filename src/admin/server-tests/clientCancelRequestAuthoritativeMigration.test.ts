import { readdirSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const migrationsDir = new URL('../../../supabase/migrations/', import.meta.url);
const sql = readFileSync(new URL('0065_client_cancel_request_authoritative.sql', migrationsDir), 'utf8');

function rpcBody(): string {
  const start = sql.indexOf('create or replace function public.client_cancel_request(');
  expect(start).toBeGreaterThan(-1);
  const asStart = sql.indexOf('as $$', start);
  const end = sql.indexOf('$$;', asStart + 5);
  return sql.slice(asStart + 5, end);
}

const body = rpcBody();

describe('0065 client cancel request authoritative migration', () => {
  it('is sequential after 0064', () => {
    const files = readdirSync(migrationsDir)
      .filter((name) => /^\d{4}_.+\.sql$/.test(name))
      .sort();
    const idx = files.indexOf('0065_client_cancel_request_authoritative.sql');
    expect(idx).toBeGreaterThan(-1);
    expect(files[idx - 1]).toBe('0064_credit_obligations_security_hardening.sql');
    expect(files[idx + 1]).toBe('0066_active_credit_obligation_gates.sql');
  });

  it('defines client_cancel_request(uuid) as security definer with empty search_path', () => {
    expect(sql).toContain('create or replace function public.client_cancel_request(p_request_id uuid)');
    expect(sql).toContain('security definer');
    expect(sql).toContain("set search_path = ''");
    expect(sql).toContain('returns jsonb');
  });

  it('requires authenticated client owner and blocks wrong roles', () => {
    expect(body).toContain('caller uuid := auth.uid()');
    expect(body).toContain("raise exception 'AUTH_REQUIRED'");
    expect(body).toContain('req.client_id is distinct from caller');
    expect(body).toContain("raise exception 'NOT_ALLOWED'");
    expect(body).toContain("prof.role is distinct from 'client'");
  });

  it('allows cancel only for open/in_progress and rejects completed/expired', () => {
    expect(body).toContain("req.status in ('completed', 'expired')");
    expect(body).toContain("raise exception 'REQUEST_NOT_CANCELLABLE'");
    expect(body).toContain("req.status is distinct from 'open'");
    expect(body).toContain("req.status is distinct from 'in_progress'");
    expect(body).not.toContain("'paused'");
  });

  it('charges 7 LC with partial debit and REQUEST_CANCEL_FEE obligation', () => {
    expect(body).toContain('v_fee_lc int := 7');
    expect(body).toContain('v_debited_lc := least(v_balance, v_fee_lc)');
    expect(body).toContain('v_debt_created_lc := v_fee_lc - v_debited_lc');
    expect(body).toContain("'REQUEST_CANCEL_FEE'");
    expect(body).toContain("'REQUEST_CANCEL_FEE'");
    expect(body).toContain("'request_cancel_fee:'");
    expect(body).toContain('insert into public.credit_obligations');
    expect(body).toContain("'client'");
    expect(body).toContain('amount_original');
    expect(body).toContain('amount_outstanding');
  });

  it('uses stable locks and idempotent ledger/obligation indexes', () => {
    expect(body).toContain('for update');
    expect(body).toContain('order by a.helper_id asc, a.id asc');
    expect(sql).toContain('client_credit_ledger_request_cancel_fee_uidx');
    expect(sql).toContain('credit_transactions_cancel_helper_comp_uidx');
    expect(body).toContain("req.status = 'cancelled'");
    expect(body).toContain('already_cancelled');
  });

  it('compensates normal helpers with +2 when APPLICATION_INTEREST debited', () => {
    expect(sql).toContain("'REQUEST_CANCEL_HELPER_COMPENSATION'");
    expect(body).toContain("ct.type = 'APPLICATION_INTEREST'");
    expect(body).toContain('ct.amount < 0');
    expect(body).toContain('comp_amount int := 2');
  });

  it('skips normal +2 when VIP displacement refund already granted', () => {
    expect(body).toContain("ct.type = 'VIP_EXCLUSIVE_PARTIAL_REFUND'");
    expect(body).toContain('continue');
  });

  it('refunds VIP via process_vip_application_rejected_refund (ceil half debit)', () => {
    expect(body).toContain('public.process_vip_application_rejected_refund');
    expect(body).toContain('app_row.is_exclusive');
  });

  it('returns required JSON payload fields', () => {
    expect(body).toContain("'request_id'");
    expect(body).toContain("'status', 'cancelled'");
    expect(body).toContain("'fee_lc'");
    expect(body).toContain("'debited_lc'");
    expect(body).toContain("'debt_created_lc'");
    expect(body).toContain("'normal_helpers_compensated'");
    expect(body).toContain("'normal_compensation_total_lc'");
    expect(body).toContain("'vip_refund_lc'");
    expect(body).toContain("'balance_after'");
  });

  it('revokes public/anon and grants execute to authenticated only', () => {
    expect(sql).toContain('revoke all on function public.client_cancel_request(uuid) from public');
    expect(sql).toContain('revoke all on function public.client_cancel_request(uuid) from anon');
    expect(sql).toContain('grant execute on function public.client_cancel_request(uuid) to authenticated');
    expect(sql).not.toMatch(/grant execute on function public\.client_cancel_request\(uuid\) to service_role/i);
  });

  it('does not include seed inserts for requests or profiles', () => {
    expect(sql).not.toMatch(/insert into public\.requests\b/i);
    expect(sql).not.toMatch(/insert into public\.profiles\b/i);
  });

  it('documents publish gate as future work', () => {
    expect(sql).toContain('Does NOT gate client_publish_request');
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

  it('does not alter numbered migrations 0001–0064', () => {
    const changed = execSync('git diff --name-only HEAD -- supabase/migrations/', {
      encoding: 'utf8',
    })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((file) =>
        /supabase\/migrations\/(000[1-9]|00[1-4]\d|005[0-9]|006[0-4])_/.test(file.replaceAll('\\', '/')),
      );
    expect(changed).toEqual([]);
  });
});
