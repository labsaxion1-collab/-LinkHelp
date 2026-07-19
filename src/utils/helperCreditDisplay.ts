import type { Job } from '@/types/job';
import { calculateHelperLeadCreditCost, type HelperLeadCreditBreakdown } from '@/utils/calculateHelperLeadCreditCost';
import { getApplicationChargeLc, ENABLE_FULL_HELPER_CREDIT_CHARGE } from '@/config/helperCreditCharge';
import { getVipApplicationChargeLc } from '@/utils/vipApplicationCredits';

export type HelperLeadCreditSummary = HelperLeadCreditBreakdown;

export type HelperCreditPublicDisplay = {
  /** Debited on apply (variable: interest + service + distance). */
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
  const chargeOnApply = getApplicationChargeLc(costs);
  const applyCost = chargeOnApply;
  const jobCost = costs.serviceCost + costs.distanceCost;
  const hireEstimate = costs.selectedCost;
  const totalEstimate = ENABLE_FULL_HELPER_CREDIT_CHARGE
    ? applyCost + hireEstimate
    : applyCost + jobCost + hireEstimate;
  return {
    applyCost,
    jobCost,
    hireEstimate,
    totalEstimate,
    chargeOnApply,
  };
}

/** LinkCredits debited when helper submits a VIP / exclusive candidatura (normal charge + surcharge). */
export function getExclusiveApplicationChargeLc(costs: HelperLeadCreditBreakdown): number {
  return getVipApplicationChargeLc(getApplicationChargeLc(costs));
}
