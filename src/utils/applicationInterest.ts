import type { Application } from '@/types/application';

export const MAX_JOB_INTERESTED = 3;

const ACTIVE_APPLICATION_STATUSES: Application['status'][] = ['pending', 'viewed', 'accepted'];

export function isActiveApplicationStatus(status: Application['status']): boolean {
  return ACTIVE_APPLICATION_STATUSES.includes(status);
}

/** Count helpers actively interested in a request (max 3 slots). */
export function countActiveApplicationsForJob(
  applications: Application[],
  jobId: string,
): number {
  let count = 0;
  for (const app of applications) {
    if (app.jobId !== jobId) continue;
    if (!isActiveApplicationStatus(app.status)) continue;
    count += 1;
  }
  return count;
}

export function buildActiveApplicationCountsByJobId(
  applications: Application[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const app of applications) {
    if (!isActiveApplicationStatus(app.status)) continue;
    counts.set(app.jobId, (counts.get(app.jobId) ?? 0) + 1);
  }
  return counts;
}

export function hasExclusiveActiveApplicationForJob(
  applications: Application[],
  jobId: string,
  viewerHelperId?: string | null,
): boolean {
  return applications.some((app) => {
    if (app.jobId !== jobId) return false;
    if (!app.isExclusive) return false;
    if (!isActiveApplicationStatus(app.status)) return false;
    if (viewerHelperId && app.helperId === viewerHelperId) return false;
    return true;
  });
}

export function isJobInterestFull(count: number, max = MAX_JOB_INTERESTED): boolean {
  return count >= max;
}
