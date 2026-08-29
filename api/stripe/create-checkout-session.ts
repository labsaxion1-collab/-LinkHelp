import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { assertServerEnvironmentIsolation, requestHostname } from '../_lib/environmentIsolation.js';
import { resolveCheckoutCreditFromServer } from '../_lib/stripe/packages.js';
import { getServerSiteUrl, resolveCheckoutSiteUrl } from '../_lib/stripe/siteUrl.js';
import { getAuthedUserId, getSupabaseAdmin } from '../_lib/stripe/supabaseAdmin.js';

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

  const isolation = assertServerEnvironmentIsolation({
    hostname: requestHostname(req),
    stripeKey: stripeSecret,
  });
  if (!isolation.ok) {
    return res.status(503).json({ error: 'ENVIRONMENT_MISCONFIGURED' });
  }

  const userId = await getAuthedUserId(req.headers.authorization);
  if (!userId) {
    return res.status(401).json({ error: 'AUTH_REQUIRED' });
  }

  const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as Body;
  const packageId = body.packageId?.trim();
  if (!packageId) {
    return res.status(400).json({ error: 'INVALID_PAYLOAD' });
  }

  const resolved = resolveCheckoutCreditFromServer({
    packageId,
    priceId: body.priceId,
    audience: 'helper',
  });
  if (resolved.ok === false) {
    return res.status(400).json({ error: resolved.code });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return res.status(503).json({ error: 'SUPABASE_ADMIN_REQUIRED' });
  }

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  if (profileError || !profile) {
    return res.status(403).json({ error: 'PROFILE_REQUIRED' });
  }
  if ((profile as { role?: string }).role === 'client') {
    return res.status(403).json({ error: 'HELPERS_ONLY' });
  }
  if ((profile as { role?: string }).role !== 'helper') {
    return res.status(403).json({ error: 'HELPERS_ONLY' });
  }

  const siteUrl = resolveCheckoutSiteUrl(body.returnOrigin, isolation.deployTarget);
  if (!siteUrl) {
    return res.status(503).json({ error: 'SITE_URL_NOT_CONFIGURED' });
  }
  const successUrl = `${siteUrl}/helper/credits/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${siteUrl}/helper/linkcredits?cancelled=true`;

  console.log('[stripe/create-checkout-session] redirect prepared', {
    deployTarget: isolation.deployTarget,
    hasReturnOrigin: Boolean(body.returnOrigin),
    hasSiteUrl: Boolean(getServerSiteUrl()),
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
        package_id: resolved.pkg.id,
        credits: String(resolved.pkg.credits),
        price_id: resolved.pkg.priceId,
        currency: resolved.pkg.currency,
        purchase_audience: 'helper',
      },
      line_items: [{ price: resolved.pkg.priceId, quantity: 1 }],
    });

    if (!session.url) {
      return res.status(500).json({ error: 'SESSION_URL_MISSING' });
    }

    return res.status(200).json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'CHECKOUT_FAILED';
    console.error('[stripe/create-checkout-session]', message);
    return res.status(500).json({ error: 'CHECKOUT_FAILED' });
  }
}
