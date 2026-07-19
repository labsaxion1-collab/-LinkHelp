import type { Job } from '@/types/job';
import { calculateHelperLeadCreditCost, type HelperLeadCreditBreakdown } from '@/utils/calculateHelperLeadCreditCost';
import { getHelperLeadCreditQuote, getHelperLeadCreditQuoteFromBreakdown } from '@/utils/helperLeadCreditQuote';
import { VIP_APPLICATION_SURCHARGE_LC } from '@/utils/vipApplicationCredits';

export type HelperLeadCreditSummary = HelperLeadCreditBreakdown;

export type HelperCreditPublicDisplay = {
  /** Debited on apply (4 LC under split charge). */
  applyCost: number;
  /** Service + distance (shown as remainder context). */
  jobCost: number;
  /** Remainder debited on hire: fullRequest − 4. */
  hireEstimate: number;
  /** Total call cost: interest + service + distance. */
  totalEstimate: number;
  chargeOnApply: number;
  fullRequestLc: number;
  normalHireRemainderLc: number;
  vipApplyLc: number;
};

export function getHelperLeadCreditSummary(job: Job, distanceKm?: number | null): HelperLeadCreditSummary {
  return calculateHelperLeadCreditCost(job, { distanceKm });
}

/** Helper-facing credit lines (split-charge official rule). */
export function getHelperCreditPublicDisplay(costs: HelperLeadCreditBreakdown): HelperCreditPublicDisplay {
  const quote = getHelperLeadCreditQuoteFromBreakdown(costs);
  return {
    applyCost: quote.normalApplyLc,
    jobCost: quote.serviceLc + quote.distanceLc,
    hireEstimate: quote.normalHireRemainderLc,
    totalEstimate: quote.fullRequestLc,
    chargeOnApply: quote.normalApplyLc,
    fullRequestLc: quote.fullRequestLc,
    normalHireRemainderLc: quote.normalHireRemainderLc,
    vipApplyLc: quote.vipApplyLc,
  };
}

/** LinkCredits debited when helper submits VIP / exclusive candidatura (full request + surcharge). */
export function getExclusiveApplicationChargeLc(costs: HelperLeadCreditBreakdown): number {
  return costs.estimatedTotal + VIP_APPLICATION_SURCHARGE_LC;
}

export { getHelperLeadCreditQuote };
