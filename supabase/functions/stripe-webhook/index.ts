import Stripe from 'npm:stripe@16.12.0';

/**
 * Legacy Edge Function — DISABLED.
 * Purchases must go through Vercel /api/stripe/webhook + numbered RPCs (0067).
 * A previously deployed copy of this function must be disabled in the Supabase
 * dashboard separately; this repo change is not a deploy.
 */
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!stripeSecret || !webhookSecret) {
    return new Response('Not configured', { status: 503 });
  }

  const sig = req.headers.get('stripe-signature');
  if (!sig) return new Response('Missing signature', { status: 400 });

  const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' });
  const body = await req.text();
  try {
    await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch {
    return new Response('Invalid signature', { status: 400 });
  }

  return new Response('Legacy Stripe webhook disabled', { status: 410 });
});
