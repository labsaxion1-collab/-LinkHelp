import type { PaymentIntent } from '@/types/payment';
import { getSupabase } from '@/lib/supabase';

/** Placeholder for Stripe / local payment integration */
export async function createDemoPaymentIntent(amountCents: number): Promise<PaymentIntent> {
  await new Promise((r) => setTimeout(r, 300));
  return {
    id: `pi_demo_${Date.now()}`,
    amountCents,
    currency: 'cad',
    status: 'succeeded',
  };
}

/** Helper LinkCredits checkout via Vercel API route */
export async function startLinkCreditCheckout(input: {
  packageId: string;
  priceId: string;
}): Promise<{ url: string }> {
  const sb = getSupabase();
  if (!sb) throw new Error('STRIPE_NOT_CONFIGURED');

  const {
    data: { session },
  } = await sb.auth.getSession();
  if (!session?.access_token) throw new Error('AUTH_REQUIRED');

  const returnOrigin = typeof window !== 'undefined' ? window.location.origin : undefined;

  const res = await fetch('/api/stripe/create-checkout-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ ...input, returnOrigin }),
  });

  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'CHECKOUT_FAILED');
  if (!data.url) throw new Error('STRIPE_NOT_CONFIGURED');
  return { url: data.url };
}
