import type { Application } from '@/types/application';
import type { Job } from '@/types/job';
import { isJobInterestFull, isRequestExclusiveLockedForViewer } from '@/utils/applicationInterest';
import { isJobCancelled, isJobExpired } from '@/utils/jobVisibility';
import {
  getJobServiceCategoryId,
  type HelperCategoryPreferences,
} from '@/utils/helperCategoryPreferences';
import { resolveCategoryId } from '@/utils/translateCategory';

export function isHelperFeedRequestActive(job: Pick<Job, 'status' | 'preferredDate' | 'expiresAt' | 'clientId'>, viewerId: string, now = Date.now()): boolean {
  if (job.status !== 'open') return false;
  if (isJobCancelled(job)) return false;
  if (isJobExpired(job, now)) return false;
  if (viewerId && job.clientId === viewerId) return false;
  return true;
}

export function isRequestExpiredApplyError(err: unknown): boolean {
  const msg =
    err instanceof Error
      ? err.message
      : err && typeof err === 'object' && 'message' in err
        ? String((err as { message?: unknown }).message ?? '')
        : String(err ?? '');
  return /REQUEST_EXPIRED/i.test(msg);
}

/** Dev/test diagnostic reasons — never show raw codes to end users. */
export type HelperFeedExclusionReason =
  | 'kept'
  | 'no_categories'
  | 'status'
  | 'own_job'
  | 'category_mismatch'
  | 'chip_filter'
  | 'dismissed'
  | 'already_engaged'
  | 'exclusive_lock'
  | 'interest_full';

export type HelperEmptyFeedKind = 'loading' | 'no_categories' | 'no_open_matches' | 'all_filtered';

export function helperHasFeedCategories(
  skillIds: string[] | null | undefined,
  prefs: Pick<HelperCategoryPreferences, 'hasExplicitPreference'>,
): boolean {
  return (Array.isArray(skillIds) && skillIds.length > 0) || prefs.hasExplicitPreference;
}

export function explainHelperFeedJobExclusion(params: {
  job: Job;
  viewerId: string;
  prefs: HelperCategoryPreferences;
  skillIds: string[];
  selectedCategoryFilters: string[];
  dismissedJobIds: Set<string>;
  engagedJobIds: Set<string>;
  applications: Application[];
}): HelperFeedExclusionReason {
  const {
    job,
    viewerId,
    prefs,
    skillIds,
    selectedCategoryFilters,
    dismissedJobIds,
    engagedJobIds,
    applications,
  } = params;

  if (!helperHasFeedCategories(skillIds, prefs)) return 'no_categories';
  if (job.status !== 'open' || isJobCancelled(job) || isJobExpired(job)) return 'status';
  if (job.clientId === viewerId) return 'own_job';

  if (prefs.hasExplicitPreference) {
    if (!jobMatchesHelperCategories(job, prefs)) return 'category_mismatch';
  }

  if (selectedCategoryFilters.length) {
    const id = resolveCategoryId(job.category) || job.category;
    if (!selectedCategoryFilters.includes(id)) return 'chip_filter';
  }

  if (dismissedJobIds.has(job.id)) return 'dismissed';
  if (engagedJobIds.has(job.id)) return 'already_engaged';
  if (isRequestExclusiveLockedForViewer(job, applications, viewerId)) return 'exclusive_lock';
  if (isJobInterestFull(job.applicantCount ?? 0)) return 'interest_full';
  return 'kept';
}

export function resolveHelperEmptyFeedKind(params: {
  skillsLoaded: boolean;
  hasCategories: boolean;
  openEligibleBeforeSoftFilters: number;
  displayedCount: number;
}): HelperEmptyFeedKind {
  const { skillsLoaded, hasCategories, openEligibleBeforeSoftFilters, displayedCount } = params;
  if (!skillsLoaded) return 'loading';
  if (!hasCategories) return 'no_categories';
  if (displayedCount > 0) return 'loading'; // unused when list non-empty
  if (openEligibleBeforeSoftFilters > 0) return 'all_filtered';
  return 'no_open_matches';
}

/** Compare helper prefs vs a job category for tests / diagnostics. */
export function jobMatchesHelperCategories(
  job: Pick<Job, 'category'>,
  prefs: HelperCategoryPreferences,
): boolean {
  if (!prefs.hasExplicitPreference) return true;
  const id = getJobServiceCategoryId(job);
  if (!id) return false;
  return id === prefs.primaryCategory || prefs.secondaryCategories.includes(id);
}
