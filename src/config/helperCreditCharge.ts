import type { HelperLeadCreditBreakdown } from '@/utils/calculateHelperLeadCreditCost';

/** When true, application debits interest + category service + distance (authoritative variable cost). */
export const ENABLE_FULL_HELPER_CREDIT_CHARGE = true;

/** Normal candidatura debit: variable lead cost (category + distance + base interest). */
export function getApplicationChargeLc(breakdown: HelperLeadCreditBreakdown): number {
  return ENABLE_FULL_HELPER_CREDIT_CHARGE ? breakdown.estimatedTotal : breakdown.interestCost;
}
