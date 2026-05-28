import type { Job } from '@/types/job';

export type LeadQualityInput = {
  job: Job;
  distanceKm?: number | null;
  /** Internal: category hire rate 0–1 */
  categoryHireRate?: number;
  /** Internal: helper ignore rate for category 0–1 */
  ignoreRate?: number;
  avgResponseMinutes?: number | null;
};

/**
 * Internal lead score (0–100). Not shown to end users — for ranking / future AI.
 */
export function computeLeadQualityScore(input: LeadQualityInput): number {
  const { job, distanceKm } = input;
  let score = 52;

  if (job.description.length > 120) score += 10;
  if (job.location.trim()) score += 8;
  if (job.budgetMin != null && job.budgetMax != null) score += 10;
  else if (job.value && !/negotiable|combinar|agree/i.test(job.value)) score += 6;
  if (job.urgency === 'high') score += 5;
  if (distanceKm != null) {
    if (distanceKm <= 5) score += 12;
    else if (distanceKm <= 15) score += 6;
    else if (distanceKm > 40) score -= 8;
  }

  const hireRate = input.categoryHireRate ?? 0.35;
  score += Math.round(hireRate * 18);

  const ignoreRate = input.ignoreRate ?? 0.2;
  score -= Math.round(ignoreRate * 15);

  if (input.avgResponseMinutes != null) {
    if (input.avgResponseMinutes <= 30) score += 6;
    else if (input.avgResponseMinutes > 180) score -= 5;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}
