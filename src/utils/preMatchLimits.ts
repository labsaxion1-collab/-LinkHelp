import type { HelperSubscriptionTier } from '@/types/helperSubscription';

/**
 * Flat pre-hire message limit per participant (client AND helper).
 * Both sides start with this many messages before the client must hire.
 * The proposal message sent with the application also counts toward
 * the helper's quota (it appears in the messages table).
 */
export const PRE_HIRE_MESSAGE_LIMIT = 5;

/** Max outgoing pre-match messages per participant. Fixed at 5 for all tiers. */
export function preMatchOutgoingLimit(_tier?: HelperSubscriptionTier): number {
  return PRE_HIRE_MESSAGE_LIMIT;
}

/** No tier grants unlimited pre-match messages in the new flat-limit model. */
export function isUnlimitedPreMatch(_tier?: HelperSubscriptionTier): boolean {
  return false;
}
