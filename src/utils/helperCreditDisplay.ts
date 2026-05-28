import type { Job } from '@/types/job';
import { calculateHelperLeadCreditCost } from '@/utils/calculateHelperLeadCreditCost';

export type HelperLeadCreditSummary = ReturnType<typeof calculateHelperLeadCreditCost>;

export function getHelperLeadCreditSummary(job: Job, distanceKm?: number | null): HelperLeadCreditSummary {
  return calculateHelperLeadCreditCost(job, { distanceKm });
}
