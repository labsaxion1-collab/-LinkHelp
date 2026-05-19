/** Temporary UI feature gates — flip to re-enable without DB/migration changes. */
export const UI_VISIBILITY = {
  ideas: false,
  clientCredits: true,
  /** Helper wallet + history page (Phase 1 foundation). */
  helperCredits: true,
  /** Real Stripe checkout for helper packages — off until Phase 2. */
  helperCreditPurchase: false,
  /** Spend credits to unlock opportunities — off until Phase 2. */
  helperCreditUnlock: false,
} as const;
