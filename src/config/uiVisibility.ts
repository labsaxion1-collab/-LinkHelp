import { CLIENT_LINKCREDITS_ENABLED } from '@/config/clientLinkCredits';

/** Temporary UI feature gates — flip to re-enable without DB/migration changes. */
export const UI_VISIBILITY = {
  ideas: false,
  /** Client LinkCredits checkout — follows CLIENT_LINKCREDITS_ENABLED. */
  clientCredits: CLIENT_LINKCREDITS_ENABLED,
  /** Helper wallet + history page (Phase 1 foundation). */
  helperCredits: true,
  /** Real Stripe checkout for helper LinkCredits packages. */
  helperCreditPurchase: true,
  /** Spend credits to unlock opportunities — off until Phase 2. */
  helperCreditUnlock: false,
  /** Training center — hidden until relaunch. */
  training: false,
} as const;
