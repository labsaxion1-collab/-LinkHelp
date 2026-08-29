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

/**
 * Architectural hire capacity per request today.
 * Multi-helper teams are NOT supported: one accept → job in_progress + other apps rejected.
 * Do not raise this without backend/RPC changes.
 */
export const MAX_HIRED_HELPERS_PER_REQUEST = 1;

/** Count accepted/completed applications for a request (authoritative hired slots filled). */
export function countHiredHelpersForJob(jobId: string, applications: Application[]): number {
  return applications.filter(
    (a) => a.jobId === jobId && (a.status === 'accepted' || a.status === 'completed'),
  ).length;
}

export function isHireTeamComplete(jobId: string, applications: Application[]): boolean {
  return countHiredHelpersForJob(jobId, applications) >= MAX_HIRED_HELPERS_PER_REQUEST;
}

/** Guard before client accept — prevents double hire / over-capacity in single-hire architecture. */
export function canAcceptApplicationForJob(params: {
  jobStatus: JobStatus;
  application: Pick<Application, 'id' | 'jobId' | 'status'>;
  applications: Application[];
  acceptingApplicationId?: string | null;
}): boolean {
  const { jobStatus, application, applications, acceptingApplicationId } = params;
  if (jobStatus !== 'open' && jobStatus !== 'paused') return false;
  if (application.status !== 'pending' && application.status !== 'viewed') return false;
  if (acceptingApplicationId != null) return false;
  if (isHireTeamComplete(application.jobId, applications)) return false;
  const alreadyHiredSame =
    applications.some(
      (a) =>
        a.jobId === application.jobId &&
        a.id === application.id &&
        (a.status === 'accepted' || a.status === 'completed'),
    );
  if (alreadyHiredSame) return false;
  return true;
}
