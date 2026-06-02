import type { Job } from '@/types/job';
import { calculateHelperLeadCreditCost, type HelperLeadCreditBreakdown } from '@/utils/calculateHelperLeadCreditCost';
import { getApplicationChargeLc } from '@/config/helperCreditCharge';

export type HelperLeadCreditSummary = HelperLeadCreditBreakdown;

export function getHelperLeadCreditSummary(job: Job, distanceKm?: number | null): HelperLeadCreditSummary {
  return calculateHelperLeadCreditCost(job, { distanceKm });
}

/** Helper-facing credit lines (no internal category/distance breakdown). */
export function getHelperCreditPublicDisplay(costs: HelperLeadCreditBreakdown) {
  const applyCost = costs.estimatedTotal;
  const hireEstimate = costs.selectedCost;
  return {
    applyCost,
    hireEstimate,
    totalEstimate: applyCost + hireEstimate,
    chargeOnApply: getApplicationChargeLc(costs),
  };
}
