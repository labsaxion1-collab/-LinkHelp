import type { HelperSubscriptionTier } from '@/types/helperSubscription';

/** Max outgoing pre-match messages per participant for this tier. */
export function preMatchOutgoingLimit(tier: HelperSubscriptionTier | undefined): number {
  switch (tier) {
    case 'ELITE':
      return 25;
    case 'PRO_HELP':
      return Number.POSITIVE_INFINITY;
    case 'BASIC':
    default:
      return 10;
  }
}

export function isUnlimitedPreMatch(tier: HelperSubscriptionTier | undefined): boolean {
  return preMatchOutgoingLimit(tier) === Number.POSITIVE_INFINITY;
}
