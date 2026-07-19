import type { HelperLeadCreditBreakdown } from '@/utils/calculateHelperLeadCreditCost';

/**
 * Official split-charge rule (frozen): Normal apply debits 4 LC; hire debits remainder.
 * Full upfront charge must remain disabled in production.
 */
export const ENABLE_FULL_HELPER_CREDIT_CHARGE = false;

/** Normal candidatura debit at apply time (interest only under split charge). */
export function getApplicationChargeLc(breakdown: HelperLeadCreditBreakdown): number {
  return ENABLE_FULL_HELPER_CREDIT_CHARGE ? breakdown.estimatedTotal : breakdown.interestCost;
}
