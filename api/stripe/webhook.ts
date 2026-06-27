import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

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

async function callConfirmStripeLinkCreditPurchase(
  payload: Record<string, unknown>,
): Promise<{ ok: true; data: unknown } | { ok: false; status: number; body: string }> {
  const cfg = getSupabaseRpcConfig();
  if (!cfg) {
    console.error('[stripe/webhook] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — cannot call RPC');
    return { ok: false, status: 503, body: 'Supabase not configured' };
  }

  const rpcUrl = `${cfg.url}/rest/v1/rpc/confirm_stripe_linkcredit_purchase`;
  const body = JSON.stringify({ payload });

  console.log('[stripe/webhook] calling helper RPC', {
    rpcUrl,
    userId: payload.user_id,
    sessionId: payload.stripe_session_id,
    credits: payload.credits,
    packageId: payload.package_id,
  });

  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: {
      apikey: cfg.serviceKey,
      Authorization: `Bearer ${cfg.serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body,
  });

  const text = await response.text();

  if (!response.ok) {
    console.error('[stripe/webhook] helper RPC call FAILED', {
      httpStatus: response.status,
      responseBody: text,
      userId: payload.user_id,
      sessionId: payload.stripe_session_id,
      credits: payload.credits,
    });
    return { ok: false, status: response.status, body: text };
  }

  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  console.log('[stripe/webhook] helper RPC success', {
    userId: payload.user_id,
    sessionId: payload.stripe_session_id,
    credits: payload.credits,
    rpcResult: data,
  });

  return { ok: true, data };
}

async function callConfirmClientStripeLinkCreditPurchase(
  payload: Record<string, unknown>,
): Promise<{ ok: true; data: unknown } | { ok: false; status: number; body: string }> {
  const cfg = getSupabaseRpcConfig();
  if (!cfg) {
    console.error('[stripe/webhook] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — cannot call RPC');
    return { ok: false, status: 503, body: 'Supabase not configured' };
  }

  const rpcUrl = `${cfg.url}/rest/v1/rpc/confirm_client_stripe_linkcredit_purchase`;
  const body = JSON.stringify({ payload });

  console.log('[stripe/webhook] calling client RPC', {
    rpcUrl,
    userId: payload.user_id,
    sessionId: payload.stripe_session_id,
    credits: payload.credits,
    packageId: payload.package_id,
  });

  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: {
      apikey: cfg.serviceKey,
      Authorization: `Bearer ${cfg.serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body,
  });

  const text = await response.text();

  if (!response.ok) {
    console.error('[stripe/webhook] client RPC call FAILED', {
      httpStatus: response.status,
      responseBody: text,
      userId: payload.user_id,
      sessionId: payload.stripe_session_id,
      credits: payload.credits,
    });
    return { ok: false, status: response.status, body: text };
  }

  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  console.log('[stripe/webhook] client RPC success', {
    userId: payload.user_id,
    sessionId: payload.stripe_session_id,
    credits: payload.credits,
    rpcResult: data,
  });

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
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid signature';
    return res.status(400).send(message);
  }

  console.log('[stripe/webhook] event received', { type: event.type, id: event.id });

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    console.log('[stripe/webhook] checkout.session.completed', {
      sessionId: session.id,
      paymentStatus: session.payment_status,
      clientReferenceId: session.client_reference_id,
      metadata: session.metadata,
      amountTotal: session.amount_total,
    });

    if (session.payment_status !== 'paid') {
      console.log('[stripe/webhook] skipping — payment_status:', session.payment_status);
      return res.status(200).send('skipped unpaid');
    }

    const meta = session.metadata ?? {};
    const userId = meta.user_id || session.client_reference_id;
    const packageId = meta.package_id;
    const credits = Number.parseInt(meta.credits ?? '', 10);
    const priceId = meta.price_id ?? '';
    const currency = meta.currency ?? 'CAD';

    if (!userId || !packageId || !Number.isFinite(credits) || credits <= 0) {
      console.error('[stripe/webhook] missing or invalid metadata', {
        meta,
        userId,
        packageId,
        credits,
        sessionId: session.id,
      });
      return res.status(200).send('missing metadata');
    }

    if (!getSupabaseRpcConfig()) {
      console.error('[stripe/webhook] Supabase env vars not set — SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
      return res.status(503).send('Supabase not configured');
    }

    const amountCents = session.amount_total ?? null;
    const paymentIntent =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id ?? null;

    const rpcPayload = {
      user_id: userId,
      stripe_session_id: session.id,
      stripe_payment_intent_id: paymentIntent,
      package_id: packageId,
      price_id: priceId,
      credits,
      amount_total: amountCents,
      currency,
      status: 'paid',
      metadata: meta,
      raw_event: event,
    };

    const audience = meta.purchase_audience === 'client' ? 'client' : 'helper';
    const result =
      audience === 'client'
        ? await callConfirmClientStripeLinkCreditPurchase(rpcPayload)
        : await callConfirmStripeLinkCreditPurchase(rpcPayload);

    if (result.ok === false) {
      return res.status(result.status >= 400 ? result.status : 500).send(result.body);
    }
  }

  return res.status(200).send('ok');
}
