import type { Job } from '@/types/job';
import { calculateHelperLeadCreditCost, type HelperLeadCreditBreakdown } from '@/utils/calculateHelperLeadCreditCost';
import { getApplicationChargeLc } from '@/config/helperCreditCharge';

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
  const applyCost = costs.applicationCost;
  const jobCost = costs.serviceCost + costs.distanceCost;
  const hireEstimate = costs.selectedCost;
  return {
    applyCost,
    jobCost,
    hireEstimate,
    totalEstimate: applyCost + jobCost + hireEstimate,
    chargeOnApply: getApplicationChargeLc(costs),
  };
}
