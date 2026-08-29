import type { Job, JobStatus } from '@/types/job';
import { partitionClientRequests } from '@/utils/clientHistoryBuckets';

/** Activities only — completed/cancelled/expired live in History. */
export type ClientActivityJobsTab = 'waiting' | 'in_progress';

/** Waiting = published / paused, still pre-hire (not listing-expired). */
export function isWaitingActivityJob(status: JobStatus): boolean {
  return status === 'open' || status === 'paused';
}

export function isInProgressActivityJob(status: JobStatus): boolean {
  return status === 'in_progress';
}

/** Status-only helper (history owns completed listings). */
export function isCompletedActivityJob(status: JobStatus): boolean {
  return status === 'completed';
}

/**
 * Activity-tab membership via authoritative clientHistoryBuckets.
 * Completed / cancelled / expired never appear here.
 */
export function filterClientJobsForActivityTab(
  jobs: Job[],
  tab: ClientActivityJobsTab,
  hiddenJobIds: ReadonlySet<string>,
  now = Date.now(),
): Job[] {
  const clientIds = [
    ...new Set(jobs.map((j) => j.clientId).filter((id): id is string => Boolean(id))),
  ];
  const out: Job[] = [];
  for (const clientId of clientIds) {
    const part = partitionClientRequests({ jobs, clientId, hiddenJobIds, now });
    out.push(...(tab === 'waiting' ? part.waiting : part.inProgress));
  }
  return out;
}
