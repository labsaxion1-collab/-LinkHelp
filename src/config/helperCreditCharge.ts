import type { HelperLeadCreditBreakdown } from '@/utils/calculateHelperLeadCreditCost';

/** When true, application debits the full estimated total (interest + service + distance). */
export const ENABLE_FULL_HELPER_CREDIT_CHARGE = false;

export function getApplicationChargeLc(breakdown: HelperLeadCreditBreakdown): number {
  return ENABLE_FULL_HELPER_CREDIT_CHARGE ? breakdown.estimatedTotal : breakdown.interestCost;
}
