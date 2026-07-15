import type { Application } from '@/types/application';
import type { Job, JobStatus } from '@/types/job';
import type { UpcomingJob } from '@/types/upcoming';

export function isPreHireActivityJob(status: JobStatus): boolean {
  return status === 'open' || status === 'paused';
}

export function isHiredActivityJob(status: JobStatus): boolean {
  return status === 'in_progress' || status === 'completed';
}

/** Active candidate pool before hire — pending/viewed only (max 3 slots). */
export function listCandidateApplicationsForJob(
  jobId: string,
  applications: Application[],
): Application[] {
  return applications
    .filter(
      (a) =>
        a.jobId === jobId &&
        (a.status === 'pending' || a.status === 'viewed'),
    )
    .sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * Authoritative hired helper for in-progress/completed cards.
 * Primary: accepted/completed application. Fallback: upcoming job helper id.
 */
export function findHiredApplicationForJob(
  job: Pick<Job, 'id'>,
  applications: Application[],
  upcomingJobs: UpcomingJob[],
): Application | undefined {
  const hired = applications.find(
    (a) =>
      a.jobId === job.id &&
      (a.status === 'accepted' || a.status === 'completed'),
  );
  if (hired) return hired;

  const upcoming = upcomingJobs.find(
    (u) => u.jobId === job.id && u.workflowStatus !== 'cancelled',
  );
  if (!upcoming) return undefined;

  return applications.find(
    (a) =>
      a.jobId === job.id &&
      a.helperId === upcoming.helperId &&
      a.status !== 'rejected' &&
      a.status !== 'cancelled',
  );
}

export function activityCandidateCount(applications: Application[]): number {
  return Math.min(applications.length, 3);
}
