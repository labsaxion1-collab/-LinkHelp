import type { PaymentIntent } from '@/types/payment';

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
