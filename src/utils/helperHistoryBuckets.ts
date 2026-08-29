import type { Application, ApplicationStatus } from '@/types/application';
import type { Job, JobStatus } from '@/types/job';
import type { UpcomingJob, UpcomingWorkflowStatus } from '@/types/upcoming';
import { isJobCancelled, isJobExpired } from '@/utils/jobVisibility';
import { buildHelperCompletedHistoryList, isActiveUpcomingWorkflow } from '@/utils/upcomingJobsPartition';
import { isCompletedWorkflowStatus } from '@/utils/completedServiceHistory';

/** Canonical application statuses stored/mapped in the app. */
export const KNOWN_APPLICATION_STATUSES = [
  'pending',
  'viewed',
  'accepted',
  'rejected',
  'completed',
  'cancelled',
] as const satisfies readonly ApplicationStatus[];

/** Candidaturas still waiting on a client decision. */
export const WAITING_APPLICATION_STATUSES = ['pending', 'viewed'] as const satisfies readonly ApplicationStatus[];

/** Terminal application outcomes that belong in history (not hired work). */
export const HISTORY_APPLICATION_STATUSES = ['rejected', 'cancelled'] as const satisfies readonly ApplicationStatus[];

export const KNOWN_JOB_STATUSES = [
  'open',
  'paused',
  'in_progress',
  'completed',
  'cancelled',
  'expired',
] as const satisfies readonly JobStatus[];

export const KNOWN_WORKFLOW_STATUSES = [
  'scheduled',
  'accepted',
  'in_progress',
  'arriving',
  'awaiting_client_confirmation',
  'completion_requested',
  'completed',
  'auto_completed',
  'cancelled',
] as const satisfies readonly UpcomingWorkflowStatus[];

export const ACTIVE_ACCEPTED_WORKFLOWS = [
  'scheduled',
  'accepted',
  'in_progress',
  'arriving',
  'awaiting_client_confirmation',
  'completion_requested',
] as const satisfies readonly UpcomingWorkflowStatus[];

export type HelperHistoryBucket =
  | 'active_applications'
  | 'active_accepted_jobs'
  | 'application_history'
  | 'completed_services';

export type HelperHistoryDiagnosticKind =
  | 'unknown_application_status'
  | 'unknown_job_status'
  | 'unknown_workflow_status';

export type HelperHistoryDiagnostic = {
  kind: HelperHistoryDiagnosticKind;
  status: string;
};

export type ApplicationHistoryReason =
  | 'rejected'
  | 'helper_cancelled'
  | 'request_cancelled'
  | 'request_expired';

export type HelperHistoryPartition = {
  activeApplications: Application[];
  activeAcceptedJobs: UpcomingJob[];
  applicationHistory: Application[];
  completedServices: UpcomingJob[];
  diagnostics: HelperHistoryDiagnostic[];
};

const WAITING = new Set<string>(WAITING_APPLICATION_STATUSES);
const HISTORY_APP = new Set<string>(HISTORY_APPLICATION_STATUSES);
const KNOWN_APP = new Set<string>(KNOWN_APPLICATION_STATUSES);
const KNOWN_JOB = new Set<string>(KNOWN_JOB_STATUSES);
const KNOWN_WORKFLOW = new Set<string>(KNOWN_WORKFLOW_STATUSES);

export function sanitizeStatusForDiagnostic(raw: unknown): string {
  const s = String(raw ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 32);
  return s || 'empty';
}

export function isKnownApplicationStatus(status: string): status is ApplicationStatus {
  return KNOWN_APP.has(status);
}

export function isWaitingApplicationStatus(status: string): boolean {
  return WAITING.has(status);
}

export function isHistoryApplicationStatus(status: string): boolean {
  return HISTORY_APP.has(status);
}

function jobStatusRaw(job: Job | undefined): string {
  return String(job?.status ?? '').toLowerCase();
}

export function isRequestExpiredForHistory(job: Job | undefined, now = Date.now()): boolean {
  if (!job) return false;
  return isJobExpired(job, now);
}

function pushUnknown(
  diagnostics: HelperHistoryDiagnostic[],
  kind: HelperHistoryDiagnosticKind,
  raw: unknown,
): void {
  const status = sanitizeStatusForDiagnostic(raw);
  if (diagnostics.some((d) => d.kind === kind && d.status === status)) return;
  diagnostics.push({ kind, status });
}

function hasActiveHire(
  helperId: string,
  jobId: string,
  upcomingJobs: UpcomingJob[],
): boolean {
  return upcomingJobs.some(
    (u) =>
      u.helperId === helperId &&
      u.jobId === jobId &&
      isActiveUpcomingWorkflow(u.workflowStatus),
  );
}

function hasCompletedHire(
  helperId: string,
  jobId: string,
  job: Job | undefined,
  upcomingJobs: UpcomingJob[],
): boolean {
  if (job?.status === 'completed') return true;
  return upcomingJobs.some(
    (u) =>
      u.helperId === helperId &&
      u.jobId === jobId &&
      isCompletedWorkflowStatus(u.workflowStatus),
  );
}

/**
 * Friendly history banner for a closed application.
 * Uses only real statuses — never invents a rejection reason.
 */
export function resolveApplicationHistoryReason(
  app: Pick<Application, 'status'>,
  job: Job | undefined,
): ApplicationHistoryReason | null {
  if (app.status === 'rejected') return 'rejected';
  if (job && isJobCancelled(job)) return 'request_cancelled';
  if (isRequestExpiredForHistory(job)) return 'request_expired';
  if (app.status === 'cancelled') return 'helper_cancelled';
  if (isWaitingApplicationStatus(app.status) && isRequestExpiredForHistory(job)) {
    return 'request_expired';
  }
  if (isWaitingApplicationStatus(app.status) && job && isJobCancelled(job)) {
    return 'request_cancelled';
  }
  return null;
}

export function applicationHistoryBannerKey(reason: ApplicationHistoryReason): string {
  switch (reason) {
    case 'rejected':
      return 'helper_tasks.rejected_banner_title';
    case 'request_cancelled':
      return 'helper_tasks.request_cancelled_banner';
    case 'request_expired':
      return 'helper_tasks.request_expired_banner';
    case 'helper_cancelled':
      return 'helper_tasks.you_cancelled_banner';
  }
}

function synthesizeAcceptedUpcoming(job: Job, app: Application): UpcomingJob {
  return {
    id: `accepted_${job.id}_${app.helperId}`,
    helperId: app.helperId,
    jobId: job.id,
    clientName: job.clientName,
    clientAvatar: job.clientAvatar,
    title: job.title,
    category: job.category,
    subcategory: job.subcategory ?? null,
    description: job.description,
    location: job.location,
    value: job.value,
    urgency: job.urgency,
    scheduledAt: job.createdAt || app.createdAt || Date.now(),
    workflowStatus: 'accepted',
    completionRequestedAt: null,
    reviewWindowEndsAt: null,
    createdAt: app.createdAt || job.createdAt || Date.now(),
  };
}

/**
 * Split helper records into mutually exclusive UI buckets.
 * Does not mutate source arrays or persist anything.
 */
export function partitionHelperHistory(params: {
  helperId: string;
  applications: Application[];
  jobs: Job[];
  upcomingJobs: UpcomingJob[];
}): HelperHistoryPartition {
  const { helperId, applications, jobs, upcomingJobs } = params;
  const diagnostics: HelperHistoryDiagnostic[] = [];
  const jobsById = new Map(jobs.map((j) => [j.id, j]));

  const activeApplications: Application[] = [];
  const applicationHistory: Application[] = [];
  const assignedAppIds = new Set<string>();
  const acceptedNeedingCard: Application[] = [];

  for (const app of applications) {
    if (app.helperId !== helperId) continue;

    if (!isKnownApplicationStatus(app.status)) {
      pushUnknown(diagnostics, 'unknown_application_status', app.status);
      if (!assignedAppIds.has(app.id)) {
        applicationHistory.push(app);
        assignedAppIds.add(app.id);
      }
      continue;
    }

    const job = jobsById.get(app.jobId);
    if (job && !KNOWN_JOB.has(jobStatusRaw(job))) {
      pushUnknown(diagnostics, 'unknown_job_status', job.status);
    }

    if (WAITING.has(app.status)) {
      if (hasActiveHire(helperId, app.jobId, upcomingJobs)) {
        assignedAppIds.add(app.id);
        continue;
      }
      if ((job && isJobCancelled(job)) || isRequestExpiredForHistory(job)) {
        applicationHistory.push(app);
        assignedAppIds.add(app.id);
        continue;
      }
      activeApplications.push(app);
      assignedAppIds.add(app.id);
      continue;
    }

    if (HISTORY_APP.has(app.status)) {
      applicationHistory.push(app);
      assignedAppIds.add(app.id);
      continue;
    }

    if (app.status === 'completed') {
      assignedAppIds.add(app.id);
      continue;
    }

    if (app.status === 'accepted') {
      if (job && isJobCancelled(job)) {
        applicationHistory.push(app);
        assignedAppIds.add(app.id);
        continue;
      }
      if (hasCompletedHire(helperId, app.jobId, job, upcomingJobs)) {
        assignedAppIds.add(app.id);
        continue;
      }
      assignedAppIds.add(app.id);
      acceptedNeedingCard.push(app);
    }
  }

  const activeAcceptedJobs: UpcomingJob[] = upcomingJobs
    .filter((u) => {
      if (u.helperId !== helperId) return false;
      if (!KNOWN_WORKFLOW.has(u.workflowStatus)) {
        pushUnknown(diagnostics, 'unknown_workflow_status', u.workflowStatus);
        return false;
      }
      if (!ACTIVE_ACCEPTED_WORKFLOWS.includes(u.workflowStatus as (typeof ACTIVE_ACCEPTED_WORKFLOWS)[number])) {
        return false;
      }
      const request = jobsById.get(u.jobId);
      if (request?.status === 'completed') return false;
      if (request && isJobCancelled(request)) return false;
      return true;
    })
    .sort((a, b) => a.scheduledAt - b.scheduledAt);

  const acceptedJobIds = new Set(activeAcceptedJobs.map((u) => `${u.jobId}:${u.helperId}`));
  for (const app of acceptedNeedingCard) {
    const key = `${app.jobId}:${app.helperId}`;
    if (acceptedJobIds.has(key)) continue;
    const job = jobsById.get(app.jobId);
    if (!job || isJobCancelled(job) || job.status === 'completed' || isRequestExpiredForHistory(job)) continue;
    activeAcceptedJobs.push(synthesizeAcceptedUpcoming(job, app));
    acceptedJobIds.add(key);
  }

  const completedServices = buildHelperCompletedHistoryList({
    helperId,
    upcomingJobs,
    jobs,
    applications,
  });

  const completedJobIds = new Set(completedServices.map((u) => u.jobId));
  const filteredAccepted = activeAcceptedJobs.filter((u) => !completedJobIds.has(u.jobId));

  activeApplications.sort((a, b) => b.createdAt - a.createdAt);
  applicationHistory.sort((a, b) => b.createdAt - a.createdAt);

  return {
    activeApplications,
    activeAcceptedJobs: filteredAccepted,
    applicationHistory,
    completedServices,
    diagnostics,
  };
}

export function assertKnownApplicationStatusesCovered(partition: HelperHistoryPartition): string[] {
  const seen = new Set<string>();
  for (const app of partition.activeApplications) seen.add(app.id);
  for (const app of partition.applicationHistory) {
    if (seen.has(app.id)) return ['duplicate_application', app.id];
    seen.add(app.id);
  }
  return [];
}
