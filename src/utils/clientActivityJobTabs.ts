import type { Job, JobStatus } from '@/types/job';
import { isJobCancelled } from '@/utils/jobVisibility';

export type ClientActivityJobsTab = 'waiting' | 'in_progress' | 'completed';

/** Waiting = published / paused, still pre-hire (not listing-expired). */
export function isWaitingActivityJob(status: JobStatus): boolean {
  return status === 'open' || status === 'paused';
}

export function isInProgressActivityJob(status: JobStatus): boolean {
  return status === 'in_progress';
}

export function isCompletedActivityJob(status: JobStatus): boolean {
  return status === 'completed';
}

/**
 * Activity-tab membership by real request status.
 * Must NOT treat preferred-date or expiresAt presentation expiry as Completed.
 * Explicit status `expired` is excluded from waiting (not an active listing).
 */
export function filterClientJobsForActivityTab(
  jobs: Job[],
  tab: ClientActivityJobsTab,
  hiddenJobIds: ReadonlySet<string>,
): Job[] {
  return jobs.filter((job) => {
    if (hiddenJobIds.has(job.id)) return false;
    if (isJobCancelled(job)) return false;
    if (job.status === 'expired') return false;
    if (tab === 'waiting') return isWaitingActivityJob(job.status);
    if (tab === 'in_progress') return isInProgressActivityJob(job.status);
    return isCompletedActivityJob(job.status);
  });
}
