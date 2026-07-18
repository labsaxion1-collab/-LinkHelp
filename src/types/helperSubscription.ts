/**
 * Legacy internal tier keys used only by portfolio runtime gates.
 * Not a commercial subscription product — do not surface in UI or session state.
 */
export type LegacyHelperTierKey = 'BASIC' | 'ELITE' | 'PRO_HELP';

/** Default portfolio limits until unified limits ship. Matches former Basic caps. */
export const PORTFOLIO_RUNTIME_TIER: LegacyHelperTierKey = 'BASIC';

/** @deprecated Use LegacyHelperTierKey. Remaining importers will be removed in a later etapa. */
export type HelperSubscriptionTier = LegacyHelperTierKey;
