import type { Job } from '@/types/job';
import { calculateHelperLeadCreditCost, type HelperLeadCreditBreakdown } from '@/utils/calculateHelperLeadCreditCost';
import { getApplicationChargeLc } from '@/config/helperCreditCharge';
import { getVipApplicationChargeLc } from '@/utils/vipApplicationCredits';

export type HelperLeadCreditSummary = HelperLeadCreditBreakdown;

export type HelperCreditPublicDisplay = {
  /** Debited on apply when ENABLE_FULL_HELPER_CREDIT_CHARGE is false (4 LC). */
  applyCost: number;
  /** Service + distance combined (no breakdown shown). */
  jobCost: number;
  hireEstimate: number;
  /** apply + job + hire estimate. */
  totalEstimate: number;
  chargeOnApply: number;
};

export function getHelperLeadCreditSummary(job: Job, distanceKm?: number | null): HelperLeadCreditSummary {
  return calculateHelperLeadCreditCost(job, { distanceKm });
}

/** Helper-facing credit lines (no service/distance breakdown). */
export function getHelperCreditPublicDisplay(costs: HelperLeadCreditBreakdown): HelperCreditPublicDisplay {
  // Public UI: apply line is always the candidatura debit (4 LC), never service+distance (estimatedTotal).
  const applyCost = costs.applicationCost;
  const jobCost = costs.serviceCost + costs.distanceCost;
  const hireEstimate = costs.selectedCost;
  const totalEstimate = applyCost + jobCost + hireEstimate;
  return {
    applyCost,
    jobCost,
    hireEstimate,
    totalEstimate,
    chargeOnApply: getApplicationChargeLc(costs),
  };
}

/** LinkCredits debited when helper submits a VIP / exclusive candidatura (normal charge + surcharge). */
export function getExclusiveApplicationChargeLc(costs: HelperLeadCreditBreakdown): number {
  return getVipApplicationChargeLc(getApplicationChargeLc(costs));
}
