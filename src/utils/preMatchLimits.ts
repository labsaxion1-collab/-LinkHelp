/**
 * Flat pre-hire message limit per participant (client AND helper).
 * Both sides start with this many messages before the client must hire.
 * The proposal message sent with the application also counts toward
 * the helper's quota (it appears in the messages table).
 */
export const PRE_HIRE_MESSAGE_LIMIT = 5;

/** Max outgoing pre-match messages per participant. Fixed for all helpers and clients. */
export function preMatchOutgoingLimit(): number {
  return PRE_HIRE_MESSAGE_LIMIT;
}

/** Pre-match messages are never unlimited in the current model. */
export function isUnlimitedPreMatch(): boolean {
  return false;
}
