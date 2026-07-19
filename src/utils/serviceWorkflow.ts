import type { UpcomingWorkflowStatus } from '@/types/upcoming';

/** Statuses where the client must confirm completion. */
export const AWAITING_COMPLETION_STATUSES: UpcomingWorkflowStatus[] = [
  'completion_requested',
  'awaiting_client_confirmation',
];

export function isAwaitingClientCompletion(status: UpcomingWorkflowStatus): boolean {
  return (AWAITING_COMPLETION_STATUSES as string[]).includes(status);
}

export function isTerminalWorkflow(status: UpcomingWorkflowStatus): boolean {
  return status === 'completed' || status === 'cancelled' || status === 'auto_completed';
}

export function isActiveWorkflow(status: UpcomingWorkflowStatus): boolean {
  return !isTerminalWorkflow(status);
}

export function canHelperRequestCompletion(status: UpcomingWorkflowStatus): boolean {
  return ['scheduled', 'in_progress', 'arriving', 'accepted'].includes(status);
}

/** Client may finalize when job is active or already awaiting helper confirmation. */
export function canClientFinalizeCompletion(
  jobStatus: string,
  workflowStatus: UpcomingWorkflowStatus,
): boolean {
  if (jobStatus === 'completed') return false;
  if (isAwaitingClientCompletion(workflowStatus)) return true;
  return jobStatus === 'in_progress' && canHelperRequestCompletion(workflowStatus);
}

/** Either side pressed complete — job is done or awaiting (helper-first legacy). */
export function isServiceCompletionInProgress(
  jobStatus: string,
  workflowStatus: UpcomingWorkflowStatus,
): boolean {
  return jobStatus === 'completed' || isAwaitingClientCompletion(workflowStatus);
}

export function shouldHideCompleteButton(
  jobStatus: string,
  workflowStatus: UpcomingWorkflowStatus,
): boolean {
  return jobStatus === 'completed' || isAwaitingClientCompletion(workflowStatus);
}

/** Hours since completion was requested (for reminder UI). */
export function hoursSinceCompletionRequested(completionRequestedAt: number | null | undefined): number {
  if (!completionRequestedAt) return 0;
  return (Date.now() - completionRequestedAt) / (1000 * 60 * 60);
}

export function shouldShowCompletionReminder(
  status: UpcomingWorkflowStatus,
  completionRequestedAt: number | null | undefined,
): boolean {
  return isAwaitingClientCompletion(status) && hoursSinceCompletionRequested(completionRequestedAt) >= 24;
}
