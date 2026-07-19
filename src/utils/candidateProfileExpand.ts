import type { Application } from '@/types/application';
import type { Job } from '@/types/job';
import type { ReviewCriterionKey } from '@/config/reviewCriteria';
import { resolveCategoryId } from '@/utils/translateCategory';

/** Four compact client criteria for helper-side candidate accordion (no Clarity). */
export const CANDIDATE_CLIENT_CRITERIA: Array<{
  key: ReviewCriterionKey;
  labelKey: string;
}> = [
  { key: 'communication', labelKey: 'service_review.criteria.communication' },
  { key: 'payment', labelKey: 'service_review.criteria.payment' },
  { key: 'punctuality', labelKey: 'service_review.criteria.punctuality' },
  { key: 'respect', labelKey: 'service_review.criteria.respect' },
];

/** Four compact criteria shown in candidate profile accordion (no Education / recommend). */
export const CANDIDATE_HELPER_CRITERIA: Array<{
  key: ReviewCriterionKey;
  labelKey: string;
}> = [
  { key: 'communication', labelKey: 'candidate_profile.criteria_communication' },
  { key: 'professionalism', labelKey: 'candidate_profile.criteria_organization' },
  { key: 'service_quality', labelKey: 'candidate_profile.criteria_quality' },
  { key: 'punctuality', labelKey: 'candidate_profile.criteria_punctuality' },
];

export type CategoryExperienceCount = {
  categoryId: string;
  count: number;
};

/** Completed jobs grouped by category for icon+count display. */
export function buildHelperCategoryExperience(
  helperId: string,
  applications: Application[],
  jobs: Job[],
): CategoryExperienceCount[] {
  const jobById = new Map(jobs.map((j) => [j.id, j]));
  const counts = new Map<string, number>();

  for (const app of applications) {
    if (app.helperId !== helperId || app.status !== 'completed') continue;
    const job = jobById.get(app.jobId);
    if (!job?.category) continue;
    const categoryId = resolveCategoryId(job.category) || job.category;
    counts.set(categoryId, (counts.get(categoryId) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([categoryId, count]) => ({ categoryId, count }))
    .sort((a, b) => b.count - a.count);
}

type MemberTFn = (key: string, vars?: Record<string, string | number>) => string;

/** Relative membership label — never raw day counts alone. */
export function formatMemberDuration(
  memberSinceMs: number | null | undefined,
  t: MemberTFn,
): string | null {
  if (!memberSinceMs || !Number.isFinite(memberSinceMs)) return null;
  const days = Math.max(0, Math.floor((Date.now() - memberSinceMs) / 86_400_000));
  if (days >= 365) {
    const years = Math.max(1, Math.floor(days / 365));
    return t('candidate_profile.member_for_years', { count: years });
  }
  if (days >= 30) {
    const months = Math.max(1, Math.floor(days / 30));
    return t('candidate_profile.member_for_months', { count: months });
  }
  const displayDays = Math.max(1, days);
  return t('candidate_profile.member_for_days', { count: displayDays });
}

export function candidateProfileExpandKey(jobId: string, applicationId: string): string {
  return `${jobId}:${applicationId}`;
}

/** Published (non-cancelled) requests for a client — existing services-requested metric. */
export function countClientServicesRequested(clientId: string, jobs: Job[]): number {
  return jobs.filter((j) => j.clientId === clientId && j.status !== 'cancelled').length;
}
