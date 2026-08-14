import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { assertServerEnvironmentIsolation, requestHostname } from '../_lib/environmentIsolation.js';
import { decideWebhookCheckoutCredit } from '../_lib/stripe/webhookCredit.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

function getSupabaseRpcConfig(): { url: string; serviceKey: string } | null {
  const base = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey) return null;
  return { url: base, serviceKey };
}

async function callConfirmRpc(
  rpcName: 'confirm_stripe_linkcredit_purchase' | 'confirm_client_stripe_linkcredit_purchase',
  payload: Record<string, unknown>,
): Promise<{ ok: true; data: unknown } | { ok: false; status: number; body: string }> {
  const cfg = getSupabaseRpcConfig();
  if (!cfg) {
    console.error('[stripe/webhook] supabase not configured');
    return { ok: false, status: 503, body: 'Supabase not configured' };
  }

  const response = await fetch(`${cfg.url}/rest/v1/rpc/${rpcName}`, {
    method: 'POST',
    headers: {
      apikey: cfg.serviceKey,
      Authorization: `Bearer ${cfg.serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ payload }),
  });

  const text = await response.text();
  if (!response.ok) {
    console.error('[stripe/webhook] rpc failed', { rpcName, httpStatus: response.status });
    return { ok: false, status: response.status, body: 'Payment confirmation failed' };
  }

  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  return { ok: true, data };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeSecret || !webhookSecret) {
    return res.status(503).send('Not configured');
  }

  const sig = req.headers['stripe-signature'];
  if (!sig || typeof sig !== 'string') {
    return res.status(400).send('Missing signature');
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: '2025-02-24.acacia' });
  let event: Stripe.Event;

  try {
    const rawBody = await readRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch {
    return res.status(400).send('Invalid signature');
  }

  const isolation = assertServerEnvironmentIsolation({
    hostname: requestHostname(req),
    stripeKey: stripeSecret,
  });
  if (isolation.ok === false) {
    console.error('[stripe/webhook] environment isolation blocked', { code: isolation.issue.code });
    return res.status(503).send(isolation.publicMessage);
  }

  console.log('[stripe/webhook] event received', {
    type: event.type,
    livemode: event.livemode,
    deployTarget: isolation.deployTarget,
  });

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const meta = session.metadata ?? {};
    const paymentIntent =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id ?? null;

    const decision = decideWebhookCheckoutCredit({
      deployTarget: isolation.deployTarget,
      livemode: event.livemode,
      paymentStatus: session.payment_status,
      userId: meta.user_id || session.client_reference_id,
      packageId: meta.package_id,
      credits: meta.credits,
      priceId: meta.price_id,
      audience: meta.purchase_audience,
      sessionId: session.id,
      paymentIntentId: paymentIntent,
      amountTotal: session.amount_total,
      currency: meta.currency ?? session.currency?.toUpperCase() ?? 'CAD',
    });

    if (decision.action === 'skip') {
      return res.status(200).send('skipped unpaid');
    }

    if (decision.action === 'reject') {
      console.error('[stripe/webhook] checkout rejected', { code: decision.code });
      return res.status(decision.httpStatus).send(decision.publicBody);
    }

    if (!getSupabaseRpcConfig()) {
      console.error('[stripe/webhook] supabase not configured');
      return res.status(503).send('Supabase not configured');
    }

    const rpcName =
      decision.audience === 'client'
        ? 'confirm_client_stripe_linkcredit_purchase'
        : 'confirm_stripe_linkcredit_purchase';
    const result = await callConfirmRpc(rpcName, decision.payload);

    if (result.ok === false) {
      return res.status(result.status >= 400 ? result.status : 500).send(result.body);
    }
  }

  return res.status(200).send('ok');
}
