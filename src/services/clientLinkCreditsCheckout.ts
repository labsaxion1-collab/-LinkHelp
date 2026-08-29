import { getSupabase } from '@/lib/supabase';
import { CLIENT_LINKCREDITS_ENABLED } from '@/config/clientLinkCredits';
import { getLinkCreditPackage } from '@/config/linkCreditPackages';

export function isClientLinkCreditsPurchaseEnabled(): boolean {
  return CLIENT_LINKCREDITS_ENABLED;
}

export type ClientLinkCreditCheckoutInput = {
  packageId: string;
};

export async function startClientLinkCreditCheckout(
  input: ClientLinkCreditCheckoutInput,
): Promise<{ url: string }> {
  if (!CLIENT_LINKCREDITS_ENABLED) {
    throw new Error('CLIENT_LINKCREDITS_DISABLED');
  }

  const pkg = getLinkCreditPackage(input.packageId);
  if (!pkg) {
    throw new Error('PACKAGE_NOT_FOUND');
  }

  const sb = getSupabase();
  if (!sb) throw new Error('STRIPE_NOT_CONFIGURED');

  const {
    data: { session },
  } = await sb.auth.getSession();
  if (!session?.access_token) throw new Error('AUTH_REQUIRED');

  const returnOrigin = typeof window !== 'undefined' ? window.location.origin : undefined;

  const res = await fetch('/api/stripe/create-client-checkout-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      packageId: input.packageId,
      returnOrigin,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'CHECKOUT_FAILED');
  if (!data.url) throw new Error('STRIPE_NOT_CONFIGURED');
  return { url: data.url };
}
