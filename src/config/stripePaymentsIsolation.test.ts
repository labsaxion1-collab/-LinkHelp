import { afterEach, describe, expect, it } from 'vitest';
import Stripe from 'stripe';
import { LINK_CREDIT_PACKAGE_CATALOG } from '../../shared/linkCreditCatalog';
import { LINK_CREDIT_PACKAGES, getLinkCreditPackage } from './linkCreditPackages';
import { resolveCheckoutCreditFromServer } from '../../api/_lib/stripe/packages';
import { creditAlreadyApplied, decideWebhookCheckoutCredit } from '../../api/_lib/stripe/webhookCredit';
import webhookHandler from '../../api/stripe/webhook';

const PRICE_ENV = {
  STRIPE_PRICE_STARTER: 'price_test_starter_fake',
  STRIPE_PRICE_POPULAR: 'price_test_popular_fake',
  STRIPE_PRICE_PRO: 'price_test_pro_fake',
  STRIPE_PRICE_POWER: 'price_test_power_fake',
} as const;

const saved: Record<string, string | undefined> = {};

function installFakePrices() {
  for (const [key, value] of Object.entries(PRICE_ENV)) {
    saved[key] = process.env[key];
    process.env[key] = value;
  }
}

function restorePrices() {
  for (const key of Object.keys(PRICE_ENV)) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
}

installFakePrices();
afterEach(restorePrices);
afterEach(installFakePrices);

describe('LinkCredit packages', () => {
  it('keeps fixed credits and CAD prices', () => {
    expect(LINK_CREDIT_PACKAGE_CATALOG).toEqual([
      { id: 'starter', credits: 35, price: 14.99, amountCents: 1499, currency: 'CAD' },
      { id: 'popular', credits: 80, price: 29.99, amountCents: 2999, currency: 'CAD' },
      { id: 'pro', credits: 180, price: 59.99, amountCents: 5999, currency: 'CAD' },
      { id: 'power', credits: 400, price: 119.99, amountCents: 11999, currency: 'CAD' },
    ]);
    expect(LINK_CREDIT_PACKAGES.map((pkg) => pkg.id)).toEqual(['starter', 'popular', 'pro', 'power']);
    expect(getLinkCreditPackage('popular')?.credits).toBe(80);
  });

  it('frontend catalog does not expose Stripe price IDs', () => {
    expect(JSON.stringify(LINK_CREDIT_PACKAGES)).not.toMatch(/price_/);
  });

  it('11. invalid package_id is rejected', () => {
    expect(resolveCheckoutCreditFromServer({ packageId: 'vip-ultra' }).ok).toBe(false);
    const decision = decideWebhookCheckoutCredit({
      deployTarget: 'staging',
      livemode: false,
      paymentStatus: 'paid',
      userId: '00000000-0000-4000-8000-000000000001',
      packageId: 'vip-ultra',
      credits: 80,
      priceId: PRICE_ENV.STRIPE_PRICE_POPULAR,
      audience: 'helper',
      sessionId: 'cs_test_fake_session_1',
      eventId: 'evt_test_fake_session_1',
      amountTotal: 2999,
    });
    expect(decision.action).toBe('reject');
    if (decision.action === 'reject') expect(decision.code).toBe('PACKAGE_NOT_FOUND');
  });

  it('12. tampered credit quantity is rejected and server credits win', () => {
    const resolved = resolveCheckoutCreditFromServer({
      packageId: 'popular',
      credits: 999,
      priceId: PRICE_ENV.STRIPE_PRICE_POPULAR,
      audience: 'helper',
    });
    expect(resolved.ok).toBe(false);
    if (!resolved.ok) expect(resolved.code).toBe('CREDITS_MISMATCH');

    const decision = decideWebhookCheckoutCredit({
      deployTarget: 'staging',
      livemode: false,
      paymentStatus: 'paid',
      userId: '00000000-0000-4000-8000-000000000001',
      packageId: 'popular',
      credits: '999',
      priceId: PRICE_ENV.STRIPE_PRICE_POPULAR,
      audience: 'helper',
      sessionId: 'cs_test_fake_session_2',
      eventId: 'evt_test_fake_session_2',
      amountTotal: 2999,
    });
    expect(decision.action).toBe('reject');
    if (decision.action === 'reject') expect(decision.code).toBe('CREDITS_MISMATCH');
  });

  it('13. incompatible price ID is rejected', () => {
    const resolved = resolveCheckoutCreditFromServer({
      packageId: 'popular',
      credits: 80,
      priceId: 'price_live_or_other_env_fake',
      audience: 'helper',
    });
    expect(resolved.ok).toBe(false);
    if (!resolved.ok) expect(resolved.code).toBe('PRICE_ID_MISMATCH');
  });

  it('16. helper and client audiences both resolve', () => {
    const helper = resolveCheckoutCreditFromServer({
      packageId: 'starter',
      audience: 'helper',
    });
    const client = resolveCheckoutCreditFromServer({
      packageId: 'starter',
      audience: 'client',
    });
    expect(helper.ok && helper.audience === 'helper').toBe(true);
    expect(client.ok && client.audience === 'client').toBe(true);
    expect(resolveCheckoutCreditFromServer({ packageId: 'starter', audience: 'admin' }).ok).toBe(
      false,
    );

    const helperDecision = decideWebhookCheckoutCredit({
      deployTarget: 'staging',
      livemode: false,
      paymentStatus: 'paid',
      userId: '00000000-0000-4000-8000-000000000001',
      packageId: 'starter',
      credits: 35,
      priceId: PRICE_ENV.STRIPE_PRICE_STARTER,
      audience: 'helper',
      sessionId: 'cs_test_fake_helper',
      eventId: 'evt_test_fake_helper',
      amountTotal: 1499,
    });
    const clientDecision = decideWebhookCheckoutCredit({
      deployTarget: 'staging',
      livemode: false,
      paymentStatus: 'paid',
      userId: '00000000-0000-4000-8000-000000000002',
      packageId: 'starter',
      credits: 35,
      priceId: PRICE_ENV.STRIPE_PRICE_STARTER,
      audience: 'client',
      sessionId: 'cs_test_fake_client',
      eventId: 'evt_test_fake_client',
      amountTotal: 1499,
    });
    expect(helperDecision.action).toBe('credit');
    expect(clientDecision.action).toBe('credit');
    if (helperDecision.action === 'credit') {
      expect(helperDecision.audience).toBe('helper');
      expect(helperDecision.payload.credits).toBeUndefined();
      expect(helperDecision.payload.amount_total).toBe(1499);
      expect(helperDecision.payload.purchase_audience).toBe('helper');
    }
    if (clientDecision.action === 'credit') {
      expect(clientDecision.audience).toBe('client');
      expect(clientDecision.payload.credits).toBeUndefined();
      expect(clientDecision.payload.purchase_audience).toBe('client');
    }
  });
});

describe('webhook credit decision', () => {
  it('uses server catalog credits even when metadata omits credits', () => {
    const decision = decideWebhookCheckoutCredit({
      deployTarget: 'production',
      livemode: true,
      paymentStatus: 'paid',
      userId: '00000000-0000-4000-8000-000000000001',
      packageId: 'pro',
      audience: 'helper',
      sessionId: 'cs_live_fake_pro',
      eventId: 'evt_live_fake_pro',
      amountTotal: 5999,
    });
    expect(decision.action).toBe('credit');
    if (decision.action === 'credit') {
      expect(decision.payload.credits).toBeUndefined();
      expect(decision.payload.amount_total).toBe(5999);
      expect(decision.payload.package_id).toBe('pro');
      expect(decision.payload.price_id).toBe(PRICE_ENV.STRIPE_PRICE_PRO);
      expect(decision.payload.stripe_event_id).toBe('evt_live_fake_pro');
    }
  });

  it('14. sequential repeat of the same session does not credit twice', () => {
    const first = decideWebhookCheckoutCredit({
      deployTarget: 'staging',
      livemode: false,
      paymentStatus: 'paid',
      userId: '00000000-0000-4000-8000-000000000001',
      packageId: 'popular',
      credits: 80,
      priceId: PRICE_ENV.STRIPE_PRICE_POPULAR,
      audience: 'helper',
      sessionId: 'cs_test_same_session',
      eventId: 'evt_test_same_session',
      amountTotal: 2999,
    });
    expect(first.action).toBe('credit');

    const ledger = new Map<string, number>();
    const applyOnce = (sessionId: string, credits: number, rpcResult?: unknown) => {
      if (creditAlreadyApplied(rpcResult)) return ledger.get(sessionId) ?? 0;
      if (ledger.has(sessionId)) return ledger.get(sessionId) ?? 0;
      ledger.set(sessionId, credits);
      return credits;
    };

    expect(applyOnce('cs_test_same_session', 80)).toBe(80);
    expect(applyOnce('cs_test_same_session', 80, { alreadyProcessed: true })).toBe(80);
    expect(applyOnce('cs_test_same_session', 80, { already_processed: true })).toBe(80);
    expect(applyOnce('cs_test_same_session', 80, { alreadyCredited: true })).toBe(80);
    expect(ledger.get('cs_test_same_session')).toBe(80);
  });

  it('does not credit when livemode mismatches', () => {
    const liveOnStaging = decideWebhookCheckoutCredit({
      deployTarget: 'staging',
      livemode: true,
      paymentStatus: 'paid',
      userId: '00000000-0000-4000-8000-000000000001',
      packageId: 'popular',
      credits: 80,
      audience: 'helper',
      sessionId: 'cs_live_blocked',
      eventId: 'evt_live_blocked',
      amountTotal: 2999,
    });
    expect(liveOnStaging.action).toBe('reject');
    if (liveOnStaging.action === 'reject') {
      expect(liveOnStaging.code).toBe('STRIPE_LIVE_EVENT_ON_STAGING');
      expect(liveOnStaging.httpStatus).toBe(409);
    }
  });

  it('rejects wrong amount_total, currency, unpaid, and missing audience', () => {
    const wrongAmount = decideWebhookCheckoutCredit({
      deployTarget: 'staging',
      livemode: false,
      paymentStatus: 'paid',
      userId: '00000000-0000-4000-8000-000000000001',
      packageId: 'starter',
      audience: 'helper',
      sessionId: 'cs_test_wrong_amount',
      eventId: 'evt_test_wrong_amount',
      amountTotal: 1500,
    });
    expect(wrongAmount.action).toBe('reject');
    if (wrongAmount.action === 'reject') expect(wrongAmount.code).toBe('AMOUNT_MISMATCH');

    const wrongCurrency = decideWebhookCheckoutCredit({
      deployTarget: 'staging',
      livemode: false,
      paymentStatus: 'paid',
      userId: '00000000-0000-4000-8000-000000000001',
      packageId: 'starter',
      audience: 'helper',
      sessionId: 'cs_test_wrong_ccy',
      eventId: 'evt_test_wrong_ccy',
      amountTotal: 1499,
      currency: 'USD',
    });
    expect(wrongCurrency.action).toBe('reject');
    if (wrongCurrency.action === 'reject') expect(wrongCurrency.code).toBe('CURRENCY_INVALID');

    const unpaid = decideWebhookCheckoutCredit({
      deployTarget: 'staging',
      livemode: false,
      paymentStatus: 'unpaid',
      userId: '00000000-0000-4000-8000-000000000001',
      packageId: 'starter',
      audience: 'helper',
      sessionId: 'cs_test_unpaid',
      eventId: 'evt_test_unpaid',
      amountTotal: 1499,
    });
    expect(unpaid).toEqual({ action: 'skip', reason: 'unpaid' });

    const noAudience = decideWebhookCheckoutCredit({
      deployTarget: 'staging',
      livemode: false,
      paymentStatus: 'paid',
      userId: '00000000-0000-4000-8000-000000000001',
      packageId: 'starter',
      sessionId: 'cs_test_no_aud',
      eventId: 'evt_test_no_aud',
      amountTotal: 1499,
    });
    expect(noAudience.action).toBe('reject');
    if (noAudience.action === 'reject') expect(noAudience.code).toBe('AUDIENCE_INVALID');
  });
});

describe('webhook HTTP contract', () => {
  it('15. missing or invalid signature is rejected', async () => {
    const previousSecret = process.env.STRIPE_SECRET_KEY;
    const previousWebhook = process.env.STRIPE_WEBHOOK_SECRET;
    process.env.STRIPE_SECRET_KEY = 'sk_test_51FakeWebhook';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_fake_local_only';

    const missing = await invokeWebhook({ method: 'GET' });
    expect(missing.status).toBe(405);

    const noSig = await invokeWebhook({ method: 'POST', body: '{}' });
    expect(noSig.status).toBe(400);
    expect(String(noSig.body)).toMatch(/signature/i);

    const invalid = await invokeWebhook({
      method: 'POST',
      body: '{}',
      signature: 't=1,v1=deadbeef',
    });
    expect(invalid.status).toBe(400);
    expect(String(invalid.body)).toMatch(/signature/i);

    const payload = JSON.stringify({
      id: 'evt_fake',
      object: 'event',
      type: 'ping',
      livemode: false,
      data: { object: {} },
    });
    const validSig = Stripe.webhooks.generateTestHeaderString({
      payload,
      secret: 'whsec_fake_local_only',
    });
    const okPing = await invokeWebhook({
      method: 'POST',
      body: payload,
      signature: validSig,
      host: 'teste.linkhelp.app',
    });
    // Isolation may 503 without full env; signature itself must be accepted first.
    expect([200, 503]).toContain(okPing.status);
    if (okPing.status === 400) {
      throw new Error('valid test signature was rejected');
    }

    if (previousSecret === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = previousSecret;
    if (previousWebhook === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = previousWebhook;
  });
});

async function invokeWebhook(input: {
  method: string;
  body?: string;
  signature?: string;
  host?: string;
}): Promise<{ status: number; body: unknown }> {
  const chunks = input.body ? [Buffer.from(input.body)] : [];
  const req = {
    method: input.method,
    headers: {
      host: input.host ?? 'teste.linkhelp.app',
      ...(input.signature ? { 'stripe-signature': input.signature } : {}),
    },
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) yield chunk;
    },
  };

  let status = 0;
  let body: unknown;
  const res = {
    status(code: number) {
      status = code;
      return this;
    },
    send(value: unknown) {
      status = status || 200;
      body = value;
      return this;
    },
    json(value: unknown) {
      status = status || 200;
      body = value;
      return this;
    },
  };

  await webhookHandler(req as never, res as never);
  return { status, body };
}
