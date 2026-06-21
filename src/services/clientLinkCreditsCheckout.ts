import { CLIENT_LINKCREDITS_ENABLED } from '@/config/clientLinkCredits';

export function isClientLinkCreditsPurchaseEnabled(): boolean {
  return CLIENT_LINKCREDITS_ENABLED;
}

export type ClientLinkCreditCheckoutInput = {
  packageId: string;
};

/**
 * Client LinkCredits purchase — separate from helper `startLinkCreditCheckout`.
 * Wire to a dedicated client Stripe flow when CLIENT_LINKCREDITS_ENABLED=true.
 */
export async function startClientLinkCreditCheckout(
  _input: ClientLinkCreditCheckoutInput,
): Promise<{ url: string }> {
  if (!CLIENT_LINKCREDITS_ENABLED) {
    throw new Error('CLIENT_LINKCREDITS_DISABLED');
  }
  throw new Error('CLIENT_LINKCREDITS_CHECKOUT_NOT_IMPLEMENTED');
}
