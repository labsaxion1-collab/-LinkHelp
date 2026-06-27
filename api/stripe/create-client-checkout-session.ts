import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { getLinkCreditPackage } from './packages.js';
import { getServerSiteUrl, resolveCheckoutSiteUrl } from './siteUrl.js';
import { getAuthedUserId, getSupabaseAdmin } from './supabaseAdmin.js';

type Body = {
  packageId?: string;
  priceId?: string;
  returnOrigin?: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) {
    return res.status(503).json({ error: 'STRIPE_NOT_CONFIGURED' });
  }

  const userId = await getAuthedUserId(req.headers.authorization);
  if (!userId) {
    return res.status(401).json({ error: 'AUTH_REQUIRED' });
  }

  const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as Body;
  const packageId = body.packageId?.trim();
  const priceId = body.priceId?.trim();
  if (!packageId || !priceId) {
    return res.status(400).json({ error: 'INVALID_PAYLOAD' });
  }

  const pkg = getLinkCreditPackage(packageId);
  if (!pkg || pkg.priceId !== priceId) {
    return res.status(400).json({ error: 'PACKAGE_PRICE_MISMATCH' });
  }

  const admin = getSupabaseAdmin();
  if (admin) {
    const { data: profile } = await admin.from('profiles').select('role').eq('id', userId).maybeSingle();
    if (profile && (profile as { role?: string }).role !== 'client') {
      return res.status(403).json({ error: 'CLIENTS_ONLY' });
    }
  }

  const siteUrl = resolveCheckoutSiteUrl(body.returnOrigin);
  const successUrl = `${siteUrl}/client/credits/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${siteUrl}/client/credits?cancelled=true`;

  console.log('[stripe/create-client-checkout-session] redirect urls', {
    returnOrigin: body.returnOrigin ?? null,
    siteUrl,
    fallbackSiteUrl: getServerSiteUrl(),
    successUrl,
    cancelUrl,
    userId,
  });

  const stripe = new Stripe(stripeSecret, { apiVersion: '2025-02-24.acacia' });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      metadata: {
        user_id: userId,
        package_id: pkg.id,
        credits: String(pkg.credits),
        price_id: pkg.priceId,
        currency: pkg.currency,
        purchase_audience: 'client',
      },
      line_items: [{ price: pkg.priceId, quantity: 1 }],
    });

    if (!session.url) {
      return res.status(500).json({ error: 'SESSION_URL_MISSING' });
    }

    return res.status(200).json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'CHECKOUT_FAILED';
    console.error('[stripe/create-client-checkout-session]', message, 'siteUrl:', siteUrl);
    return res.status(500).json({ error: message });
  }
}
