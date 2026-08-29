import type { Application } from '@/types/application';
import type { Job } from '@/types/job';
import type { UpcomingJob, UpcomingWorkflowStatus } from '@/types/upcoming';
import { isCompletedWorkflowStatus } from '@/utils/completedServiceHistory';
import { isAwaitingClientCompletion, isTerminalWorkflow } from '@/utils/serviceWorkflow';
import { isJobCancelled } from '@/utils/jobVisibility';

/** Active / in-progress upcoming rows (excludes terminal completed + cancelled). */
export function isActiveUpcomingWorkflow(status: UpcomingWorkflowStatus): boolean {
  return !isTerminalWorkflow(status);
}

/** Keep cancelled out of AppData; retain completed history rows. */
export function shouldDropUpcomingFromStore(status: UpcomingWorkflowStatus): boolean {
  return status === 'cancelled';
}

export function filterActiveUpcomingJobs(rows: UpcomingJob[]): UpcomingJob[] {
  return rows.filter((u) => isActiveUpcomingWorkflow(u.workflowStatus));
}

function synthesizeCompletedUpcoming(job: Job, app: Application): UpcomingJob {
  return {
    id: `history_${job.id}_${app.helperId}`,
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
    scheduledAt: job.createdAt || Date.now(),
    workflowStatus: 'completed',
    completionRequestedAt: job.createdAt || Date.now(),
    reviewWindowEndsAt: null,
    createdAt: job.createdAt || Date.now(),
  };
}

/**
 * Helper Concluídos history — one card per requestId.
 * Includes completed / auto_completed workflows and legacy request.status=completed.
 * Excludes awaiting_client_confirmation / completion_requested.
 */
export function buildHelperCompletedHistoryList(params: {
  helperId: string;
  upcomingJobs: UpcomingJob[];
  jobs: Job[];
  applications: Application[];
}): UpcomingJob[] {
  const { helperId, upcomingJobs, jobs, applications } = params;
  const byJobId = new Map<string, UpcomingJob>();

  for (const u of upcomingJobs) {
    if (u.helperId !== helperId) continue;
    if (u.workflowStatus === 'cancelled') continue;
    if (isAwaitingClientCompletion(u.workflowStatus)) continue;

    const request = jobs.find((j) => j.id === u.jobId);
    if (request && isJobCancelled(request)) continue;

    const terminal =
      isCompletedWorkflowStatus(u.workflowStatus) || request?.status === 'completed';
    if (!terminal) continue;

    byJobId.set(u.jobId, u);
  }

  for (const app of applications) {
    if (app.helperId !== helperId) continue;
    if (app.status !== 'accepted' && app.status !== 'completed') continue;
    if (byJobId.has(app.jobId)) continue;

    const request = jobs.find((j) => j.id === app.jobId);
    if (!request || request.status !== 'completed') continue;
    if (isJobCancelled(request)) continue;

    byJobId.set(app.jobId, synthesizeCompletedUpcoming(request, app));
  }

  return [...byJobId.values()].sort((a, b) => b.scheduledAt - a.scheduledAt);
}

/** Official completion for review unlock — never awaiting. */
export function isOfficiallyCompletedForReview(
  jobStatus: Job['status'] | string,
  workflowStatus?: UpcomingWorkflowStatus | null,
): boolean {
  if (jobStatus === 'completed') return true;
  if (workflowStatus && isCompletedWorkflowStatus(workflowStatus)) return true;
  return false;
}
