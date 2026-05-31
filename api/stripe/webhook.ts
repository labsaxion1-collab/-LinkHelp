import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { getSupabaseAdmin } from '../_lib/supabaseAdmin';

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

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.payment_status !== 'paid') {
      return res.status(200).send('skipped unpaid');
    }

    const meta = session.metadata ?? {};
    const userId = meta.user_id || session.client_reference_id;
    const packageId = meta.package_id;
    const credits = Number.parseInt(meta.credits ?? '', 10);
    const priceId = meta.price_id ?? '';
    const currency = meta.currency ?? 'CAD';

    if (!userId || !packageId || !Number.isFinite(credits) || credits <= 0) {
      console.error('[stripe/webhook] missing metadata', meta);
      return res.status(200).send('missing metadata');
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return res.status(503).send('Supabase not configured');
    }

    const amountCents = session.amount_total ?? null;
    const paymentIntent =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id ?? null;

    const { error } = await admin.rpc('confirm_stripe_linkcredit_purchase', {
      p_user_id: userId,
      p_stripe_session_id: session.id,
      p_stripe_payment_intent: paymentIntent,
      p_package_id: packageId,
      p_price_id: priceId,
      p_credits: credits,
      p_amount_cents: amountCents,
      p_currency: currency,
      p_status: 'paid',
      p_raw_event: event as unknown as Record<string, unknown>,
    });

    if (error) {
      console.error('[stripe/webhook] confirm_stripe_linkcredit_purchase', error.message);
      return res.status(500).send(error.message);
    }
  }

  return res.status(200).send('ok');
}
