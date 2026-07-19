import type { Job } from '@/types/job';
import {
  calculateHelperLeadCreditCost,
  isRemoteJob,
  type HelperLeadCreditBreakdown,
} from '@/utils/calculateHelperLeadCreditCost';
import { VIP_APPLICATION_SURCHARGE_LC } from '@/utils/vipApplicationCredits';

/** Official split-charge quote — mirrors server helper_compute_lead_estimated_total_lc + hire remainder. */
export type HelperLeadCreditQuote = HelperLeadCreditBreakdown & {
  interestLc: number;
  serviceLc: number;
  distanceLc: number;
  fullRequestLc: number;
  normalApplyLc: number;
  normalHireRemainderLc: number;
  vipApplyLc: number;
  isRemote: boolean;
};

export function getHelperLeadCreditQuoteFromBreakdown(
  breakdown: HelperLeadCreditBreakdown,
  isRemote = false,
): HelperLeadCreditQuote {
  const fullRequestLc = breakdown.estimatedTotal;
  const normalApplyLc = breakdown.interestCost;
  const normalHireRemainderLc = Math.max(0, fullRequestLc - normalApplyLc);
  return {
    ...breakdown,
    interestLc: breakdown.interestCost,
    serviceLc: breakdown.serviceCost,
    distanceLc: breakdown.distanceCost,
    fullRequestLc,
    normalApplyLc,
    normalHireRemainderLc,
    vipApplyLc: fullRequestLc + VIP_APPLICATION_SURCHARGE_LC,
    isRemote,
  };
}

export function getHelperLeadCreditQuote(
  job: Job,
  options?: { distanceKm?: number | null },
): HelperLeadCreditQuote {
  const breakdown = calculateHelperLeadCreditCost(job, options);
  return getHelperLeadCreditQuoteFromBreakdown(breakdown, isRemoteJob(job));
}
