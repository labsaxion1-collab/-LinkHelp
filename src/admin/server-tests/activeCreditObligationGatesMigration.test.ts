import { readdirSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const migrationsDir = new URL('../../../supabase/migrations/', import.meta.url);
const sql = readFileSync(new URL('0066_active_credit_obligation_gates.sql', migrationsDir), 'utf8');
const appDataRemote = readFileSync(
  new URL('../../../src/services/supabase/appDataRemote.ts', import.meta.url),
  'utf8',
);
const helperApplicationService = readFileSync(
  new URL('../../../src/services/supabase/helperApplicationService.ts', import.meta.url),
  'utf8',
);
const createModal = readFileSync(
  new URL('../../../src/components/client/create-request/CreateRequestModal.tsx', import.meta.url),
  'utf8',
);
const reviewStep = readFileSync(
  new URL('../../../src/components/client/create-request/CreateRequestReviewStep.tsx', import.meta.url),
  'utf8',
);
const helperDashboard = readFileSync(
  new URL('../../../src/pages/helper/HelperDashboard.tsx', import.meta.url),
  'utf8',
);
const pt = readFileSync(new URL('../../../src/translations/pt/index.ts', import.meta.url), 'utf8');
const en = readFileSync(new URL('../../../src/translations/en/index.ts', import.meta.url), 'utf8');
const fr = readFileSync(new URL('../../../src/translations/fr/index.ts', import.meta.url), 'utf8');

function fnBody(source: string, sig: string): string {
  const start = source.indexOf(sig);
  expect(start).toBeGreaterThan(-1);
  const asStart = source.indexOf('as $$', start);
  const end = source.indexOf('$$;', asStart + 5);
  return source.slice(asStart + 5, end);
}

const publishBody = fnBody(sql, 'create or replace function public.client_publish_request(');
const submitBody = fnBody(sql, 'create or replace function public.helper_submit_application(');
const cancelSql = readFileSync(
  new URL('0065_client_cancel_request_authoritative.sql', migrationsDir),
  'utf8',
);

describe('0066 active credit obligation gates migration', () => {
  it('is sequential after 0065', () => {
    const files = readdirSync(migrationsDir)
      .filter((name) => /^\d{4}_.+\.sql$/.test(name))
      .sort();
    const idx = files.indexOf('0066_active_credit_obligation_gates.sql');
    expect(idx).toBeGreaterThan(-1);
    expect(files[idx - 1]).toBe('0065_client_cancel_request_authoritative.sql');
    expect(files[idx + 1]).toBe('0067_stripe_credit_purchase_obligation_settlement.sql');
  });

  it('gates client_publish_request before balance debit and request insert', () => {
    expect(publishBody).toContain("raise exception 'ACTIVE_CREDIT_OBLIGATION'");
    expect(publishBody).toContain("o.status = 'open'");
    expect(publishBody).toContain('o.amount_outstanding > 0');
    expect(publishBody.indexOf('ACTIVE_CREDIT_OBLIGATION')).toBeLessThan(
      publishBody.indexOf('v_balance := coalesce(p.credits, 0)'),
    );
    expect(publishBody.indexOf('ACTIVE_CREDIT_OBLIGATION')).toBeLessThan(
      publishBody.indexOf('insert into public.requests'),
    );
    expect(publishBody).toContain('for update');
    expect(publishBody).toContain('v_cost int := 1');
  });

  it('locks helper_submit_application request before wallet (no wallet-first)', () => {
    expect(submitBody).toContain('w_helper_wallet public.credit_wallets');
    expect(submitBody).not.toContain('w_obligation_gate');
    expect(submitBody).toContain('-- LOCK 1: request row');
    expect(submitBody).toContain('-- LOCK 2: helper wallet');
    const requestLockPos = submitBody.indexOf('-- LOCK 1: request row');
    const walletLockPos = submitBody.indexOf('-- LOCK 2: helper wallet');
    expect(requestLockPos).toBeGreaterThan(-1);
    expect(walletLockPos).toBeGreaterThan(requestLockPos);
    const firstRequestForUpdate = submitBody.indexOf('from public.requests');
    const firstWalletForUpdate = submitBody.indexOf('from public.credit_wallets');
    expect(firstRequestForUpdate).toBeGreaterThan(-1);
    expect(firstWalletForUpdate).toBeGreaterThan(firstRequestForUpdate);
  });

  it('gates ACTIVE_CREDIT_OBLIGATION after locks and before debit', () => {
    expect(submitBody).toContain("raise exception 'ACTIVE_CREDIT_OBLIGATION'");
    const obligationPos = submitBody.indexOf("raise exception 'ACTIVE_CREDIT_OBLIGATION'");
    const walletLockPos = submitBody.indexOf('-- LOCK 2: helper wallet');
    const debitPos = submitBody.indexOf('helper_debit_application_interest');
    expect(walletLockPos).toBeLessThan(obligationPos);
    expect(obligationPos).toBeLessThan(debitPos);
    expect(submitBody.indexOf('insert into public.applications')).toBeGreaterThan(obligationPos);
  });

  it('revalidates quote after request lock and preserves normal/VIP charges', () => {
    expect(submitBody).toContain('Revalidate quote/charge after request lock');
    expect(submitBody).toContain('authoritative_charge := 4');
    expect(submitBody).toContain('authoritative_charge := snap_total + 4');
    expect(sql).toContain(
      'create or replace function public.helper_submit_application(\r\n  p_request_id uuid,\r\n  p_helper_id uuid,\r\n  p_client_id uuid,\r\n  p_message text default null,\r\n  p_proposed_amount numeric default null,\r\n  p_interest_amount int default null,\r\n  p_is_exclusive boolean default false\r\n)',
    );
  });

  it('documents deadlock-safe lock order shared with 0065 cancel', () => {
    expect(sql).toContain('client_cancel_request:  profiles → request → applications → helper wallets');
    expect(sql).toContain('helper_submit_application: request → helper wallet');
    expect(sql).toContain('Future HIRE_ARREARS settlement should follow: request/application → wallet → obligation');
    const cancelRequestLock = cancelSql.indexOf('-- LOCK 2: request row');
    const cancelWalletLock = cancelSql.indexOf('from public.credit_wallets');
    expect(cancelRequestLock).toBeGreaterThan(-1);
    expect(cancelWalletLock).toBeGreaterThan(cancelRequestLock);
  });

  it('does not alter has_active_credit_obligation helper from 0064', () => {
    expect(sql).not.toContain('create or replace function public.has_active_credit_obligation');
  });

  it('preserves RPC security grants for authenticated only', () => {
    expect(sql).toContain('revoke all on function public.client_publish_request(jsonb, boolean) from public');
    expect(sql).toContain('grant execute on function public.client_publish_request(jsonb, boolean) to authenticated');
    expect(sql).toContain(
      'revoke all on function public.helper_submit_application(uuid, uuid, uuid, text, numeric, int, boolean) from anon',
    );
    expect(sql).toContain(
      'grant execute on function public.helper_submit_application(uuid, uuid, uuid, text, numeric, int, boolean) to authenticated',
    );
  });

  it('frontend maps ACTIVE_CREDIT_OBLIGATION without auto-retry on publish', () => {
    expect(appDataRemote).toContain('ActiveCreditObligationError');
    expect(appDataRemote).toContain("error.message?.includes('ACTIVE_CREDIT_OBLIGATION')");
    expect(helperApplicationService).toContain("msg.includes('ACTIVE_CREDIT_OBLIGATION')");
    expect(createModal).toContain('ActiveCreditObligationError');
    expect(createModal).toContain('baseline_finance.active_credit_obligation_client');
    expect(createModal).not.toMatch(/ACTIVE_CREDIT_OBLIGATION[\s\S]*await createJob\(/);
    expect(helperDashboard).toContain('baseline_finance.active_credit_obligation_helper');
  });

  it('review step shows publish/cancel/debt/expiry notice copy', () => {
    expect(reviewStep).toContain('publish_finance_notice_publish_1lc');
    expect(reviewStep).toContain('publish_finance_notice_cancel_7lc');
    expect(reviewStep).toContain('publish_finance_notice_debt_blocks');
    expect(reviewStep).toContain('publish_finance_notice_expires_7d');
    expect(pt).toContain('publish_finance_notice_publish_1lc');
    expect(pt).toContain('Publicar custa 1 LC');
    expect(pt).toContain('Cancelar custa 7 LC');
    expect(en).toContain('Publishing costs 1 LC');
    expect(fr).toContain('Publier coûte 1 LC');
  });

  it('translates obligation messages in pt/en/fr', () => {
    expect(pt).toContain('Você possui LinkCredits pendentes. Quite o saldo antes de criar outro pedido.');
    expect(pt).toContain('Você possui LinkCredits pendentes. Quite o saldo antes de enviar outra candidatura.');
    expect(en).toContain('Settle the balance before creating another request.');
    expect(en).toContain('Settle the balance before submitting another application.');
    expect(fr).toContain('Réglez le solde avant de créer une autre demande.');
    expect(fr).toContain('Réglez le solde avant d’envoyer une autre candidature.');
  });

  it('keeps exactly six Vercel API route handlers', () => {
    const out = execSync('powershell -NoProfile -Command "(Get-ChildItem -Path api -Recurse -Include *.ts | Where-Object { $_.FullName -notmatch \'_lib\' }).Count"', {
      encoding: 'utf8',
    }).trim();
    expect(Number.parseInt(out, 10)).toBe(6);
  });
});
