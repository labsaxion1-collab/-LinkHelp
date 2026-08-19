import { readdirSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const migrationsDir = new URL('../../../supabase/migrations/', import.meta.url);
const sql = readFileSync(
  new URL('0067_stripe_credit_purchase_obligation_settlement.sql', migrationsDir),
  'utf8',
);
const webhook = readFileSync(new URL('../../../api/stripe/webhook.ts', import.meta.url), 'utf8');
const helperCheckout = readFileSync(
  new URL('../../../api/stripe/create-checkout-session.ts', import.meta.url),
  'utf8',
);
const clientCheckout = readFileSync(
  new URL('../../../api/stripe/create-client-checkout-session.ts', import.meta.url),
  'utf8',
);
const catalog = readFileSync(new URL('../../../shared/linkCreditCatalog.ts', import.meta.url), 'utf8');
const edgeWebhook = readFileSync(
  new URL('../../../supabase/functions/stripe-webhook/index.ts', import.meta.url),
  'utf8',
);
const helperSuccess = readFileSync(
  new URL('../../../src/pages/helper/HelperCreditsSuccessPage.tsx', import.meta.url),
  'utf8',
);
const clientSuccess = readFileSync(
  new URL('../../../src/pages/client/ClientCreditsSuccessPage.tsx', import.meta.url),
  'utf8',
);

function fnBody(source: string, sig: string): string {
  const start = source.indexOf(sig);
  expect(start).toBeGreaterThan(-1);
  const asStart = source.indexOf('as $$', start);
  const end = source.indexOf('$$;', asStart + 5);
  expect(end).toBeGreaterThan(asStart);
  return source.slice(asStart + 5, end);
}

const applyBody = fnBody(sql, 'create or replace function public.confirm_stripe_linkcredit_purchase_apply(');
const settleBody = fnBody(sql, 'create or replace function public.apply_credit_obligation_settlements_from_purchase(');
const helperRpc = sql.slice(sql.indexOf('create or replace function public.confirm_stripe_linkcredit_purchase(payload jsonb)'));
const clientRpc = sql.slice(sql.indexOf('create or replace function public.confirm_client_stripe_linkcredit_purchase(payload jsonb)'));
const legacyRpc = sql.slice(sql.indexOf('create or replace function public.confirm_credit_purchase('));

describe('0067 stripe credit purchase obligation settlement', () => {
  it('is sequential after 0066', () => {
    const files = readdirSync(migrationsDir)
      .filter((name) => /^\d{4}_.+\.sql$/.test(name))
      .sort();
    const idx = files.indexOf('0067_stripe_credit_purchase_obligation_settlement.sql');
    expect(idx).toBeGreaterThan(-1);
    expect(files[idx - 1]).toBe('0066_active_credit_obligation_gates.sql');
    expect(files.at(-1)).toBe('0067_stripe_credit_purchase_obligation_settlement.sql');
  });

  it('1. freezes starter/popular/pro/power credits and CAD cents', () => {
    expect(sql).toContain("('starter'::text, 35, 1499)");
    expect(sql).toContain("('popular'::text, 80, 2999)");
    expect(sql).toContain("('pro'::text, 180, 5999)");
    expect(sql).toContain("('power'::text, 400, 11999)");
    expect(catalog).toContain('amountCents: 1499');
    expect(catalog).toContain('amountCents: 2999');
    expect(catalog).toContain('amountCents: 5999');
    expect(catalog).toContain('amountCents: 11999');
    expect(sql).not.toMatch(/from public\.credit_packages/i);
    expect(applyBody).not.toContain('credit_packages');
  });

  it('2. exposes helper and client confirm RPCs', () => {
    expect(sql).toContain('create or replace function public.confirm_stripe_linkcredit_purchase(payload jsonb)');
    expect(sql).toContain('create or replace function public.confirm_client_stripe_linkcredit_purchase(payload jsonb)');
    expect(helperRpc).toContain("public.confirm_stripe_linkcredit_purchase_apply(payload, 'helper')");
    expect(clientRpc).toContain("public.confirm_stripe_linkcredit_purchase_apply(payload, 'client')");
  });

  it('3–8. purchase accounting: gross, settlement, net, oldest-first, ignore settled/written_off', () => {
    expect(applyBody).toContain('v_gross := pkg.credits');
    expect(applyBody).toContain("'CREDIT_PURCHASE'");
    expect(applyBody).toContain("'OBLIGATION_SETTLEMENT'");
    expect(applyBody).toContain('-v_settled');
    expect(applyBody).toContain('v_after_purchase := v_before + v_gross');
    expect(applyBody).toContain('v_final := v_before + v_net');
    expect(applyBody).toContain('total_purchased = total_purchased + v_gross');
    expect(applyBody).toContain('total_spent = total_spent + v_settled');
    expect(settleBody).toContain("status = 'open'");
    expect(settleBody).toContain('amount_outstanding > 0');
    expect(settleBody).toContain('order by created_at asc, id asc');
    expect(settleBody).not.toContain('written_off');
    expect(applyBody).toContain("'gross_lc'");
    expect(applyBody).toContain("'settled_lc'");
    expect(applyBody).toContain("'net_lc'");
  });

  it('9. helper total_purchased increases by gross not net', () => {
    expect(applyBody).toContain('total_purchased = total_purchased + v_gross');
    expect(applyBody).not.toContain('total_purchased = total_purchased + v_net');
  });

  it('10–12. idempotent retry, concurrency lock, paid only after ledgers', () => {
    expect(applyBody).toContain('when unique_violation then');
    expect(applyBody).toContain('for update');
    expect(applyBody).toContain('alreadyProcessed');
    expect(applyBody).toContain('v_purchase_complete');
    expect(applyBody).toContain("v_pe.status = 'paid' and v_purchase_complete");
    expect(applyBody.lastIndexOf("status = 'paid'")).toBeGreaterThan(applyBody.indexOf("'OBLIGATION_SETTLEMENT'"));
    expect(sql).toContain('credit_transactions_stripe_session_purchase_uidx');
    expect(sql).toContain('client_credit_ledger_stripe_session_uidx');
    expect(sql).toContain('payment_events_stripe_event_id_uidx');
    expect(sql).toContain('credit_obligation_settlements_event_obligation_uidx');
  });

  it('13–17. rejects tampered credits, amount, currency, unpaid, audience/role', () => {
    expect(applyBody).toContain("raise exception 'CREDITS_MISMATCH'");
    expect(applyBody).toContain("raise exception 'AMOUNT_MISMATCH'");
    expect(applyBody).toContain("raise exception 'CURRENCY_INVALID'");
    expect(applyBody).toContain("raise exception 'PAYMENT_NOT_PAID'");
    expect(applyBody).toContain("raise exception 'AUDIENCE_INVALID'");
    expect(applyBody).toContain("raise exception 'HELPER_ONLY'");
    expect(applyBody).toContain("raise exception 'CLIENT_ONLY'");
    expect(applyBody).toContain('v_gross := pkg.credits');
    expect(applyBody).not.toContain('v_gross := p_claimed_credits');
  });

  it('18. revokes PUBLIC/anon/authenticated EXECUTE from Stripe confirm RPCs', () => {
    expect(sql).toContain('revoke all on function public.confirm_stripe_linkcredit_purchase(jsonb) from public');
    expect(sql).toContain('revoke all on function public.confirm_stripe_linkcredit_purchase(jsonb) from anon');
    expect(sql).toContain('revoke all on function public.confirm_stripe_linkcredit_purchase(jsonb) from authenticated');
    expect(sql).toContain('grant execute on function public.confirm_stripe_linkcredit_purchase(jsonb) to service_role');
    expect(sql).toContain('revoke all on function public.confirm_client_stripe_linkcredit_purchase(jsonb) from public');
    expect(sql).toContain('revoke all on function public.confirm_client_stripe_linkcredit_purchase(jsonb) from anon');
    expect(sql).toContain('revoke all on function public.confirm_client_stripe_linkcredit_purchase(jsonb) from authenticated');
    expect(sql).toContain('grant execute on function public.confirm_client_stripe_linkcredit_purchase(jsonb) to service_role');
  });

  it('19. disables legacy confirm_credit_purchase', () => {
    expect(legacyRpc).toContain("raise exception 'LEGACY_CREDIT_PURCHASE_DISABLED'");
    expect(sql).toContain('revoke all on function public.confirm_credit_purchase(uuid, text, text) from public');
    expect(sql).toContain('revoke all on function public.confirm_credit_purchase(uuid, text, text) from anon');
    expect(sql).toContain('revoke all on function public.confirm_credit_purchase(uuid, text, text) from authenticated');
    expect(sql).toContain('revoke all on function public.confirm_credit_purchase(uuid, text, text) from service_role');
  });

  it('creates settlement table with FKs, amount > 0, unique keys, SELECT-only RLS', () => {
    expect(sql).toContain('create table if not exists public.credit_obligation_settlements');
    expect(sql).toContain('references public.credit_obligations');
    expect(sql).toContain('references public.payment_events');
    expect(sql).toContain('credit_obligation_settlements_amount_pos_check');
    expect(sql).toContain('amount > 0');
    expect(sql).toContain('credit_obligation_settlements_idempotency_key_uidx');
    expect(sql).toContain('credit_obligation_settlements_event_obligation_uidx');
    expect(sql).toContain('enable row level security');
    expect(sql).toContain('credit_obligation_settlements_select_own');
    expect(sql).not.toMatch(/grant (insert|update|delete) on table public\.credit_obligation_settlements/i);
  });

  it('uses empty search_path and SECURITY DEFINER on public confirm RPCs', () => {
    expect(helperRpc).toContain('security definer');
    expect(helperRpc).toContain("set search_path = ''");
    expect(clientRpc).toContain('security definer');
    expect(clientRpc).toContain("set search_path = ''");
    expect(sql).toContain('create or replace function public.confirm_stripe_linkcredit_purchase_apply(');
    expect(sql).toMatch(/confirm_stripe_linkcredit_purchase_apply\([\s\S]{0,400}set search_path = ''/);
  });

  it('locks payment event then buyer balance then obligations, never request', () => {
    const peLock = applyBody.indexOf('-- LOCK 1: payment event / session');
    const helperWallet = applyBody.indexOf('-- LOCK 2: helper wallet');
    const clientProfile = applyBody.indexOf('-- LOCK 2: client profile');
    const oblLock = applyBody.indexOf('-- LOCK 3: open obligations oldest-first');
    expect(peLock).toBeGreaterThan(-1);
    expect(helperWallet).toBeGreaterThan(peLock);
    expect(clientProfile).toBeGreaterThan(peLock);
    expect(oblLock).toBeGreaterThan(helperWallet);
    expect(oblLock).toBeGreaterThan(clientProfile);
    expect(applyBody).not.toContain('from public.requests');
    expect(applyBody).not.toContain('for update of request');
  });

  it('20. webhook keeps signature and sends event/session/payment/amount/audience', () => {
    expect(webhook).toContain('constructEvent');
    expect(webhook).toContain("req.headers['stripe-signature']");
    expect(webhook).toContain('eventId: event.id');
    expect(webhook).toContain('sessionId: session.id');
    expect(webhook).toContain('paymentIntentId: paymentIntent');
    expect(webhook).toContain('amountTotal: session.amount_total');
    expect(webhook).toContain('meta.purchase_audience');
    expect(webhook).toContain("session.payment_status");
    expect(webhook).toContain('event.livemode');
  });

  it('21. checkout fails closed without Supabase Admin and does not skip role checks', () => {
    expect(helperCheckout).toContain("error: 'SUPABASE_ADMIN_REQUIRED'");
    expect(clientCheckout).toContain("error: 'SUPABASE_ADMIN_REQUIRED'");
    expect(helperCheckout).not.toContain('if (admin) {');
    expect(clientCheckout).not.toContain('if (admin) {');
    expect(helperCheckout).toContain("error: 'HELPERS_ONLY'");
    expect(clientCheckout).toContain("error: 'CLIENTS_ONLY'");
  });

  it('disables the legacy Edge Function credit path without adding Vercel handlers', () => {
    expect(edgeWebhook).toContain('Legacy Stripe webhook disabled');
    expect(edgeWebhook).toContain('status: 410');
    expect(edgeWebhook).not.toContain('confirm_credit_purchase');
    expect(edgeWebhook).not.toContain('confirm_stripe_linkcredit_purchase');
  });

  it('success pages still only poll and never credit', () => {
    expect(helperSuccess).toContain('refresh()');
    expect(clientSuccess).toContain('refreshProfile');
    expect(helperSuccess).not.toContain('confirm_stripe_linkcredit_purchase');
    expect(clientSuccess).not.toContain('confirm_client_stripe_linkcredit_purchase');
  });

  it('22. keeps exactly six Vercel API route handlers', () => {
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
});
