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

export async function createCheckoutSession(input: {
  packageId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string }> {
  const sb = getSupabase();
  if (!sb) throw new Error('STRIPE_NOT_CONFIGURED');
  const { data, error } = await sb.functions.invoke('create-checkout-session', {
    body: input,
  });
  if (error) throw error;
  const url = (data as { url?: string } | null)?.url;
  if (!url) throw new Error('STRIPE_NOT_CONFIGURED');
  return { url };
}
