import type { Application } from '@/types/application';
import type { Job } from '@/types/job';
import type { ServiceReview } from '@/types/review';
import type { UpcomingJob, UpcomingWorkflowStatus } from '@/types/upcoming';
import { findHiredApplicationForJob } from '@/utils/clientActivityApplications';

export type CompletedReviewUiState = 'pending' | 'submitted';

export function isCompletedWorkflowStatus(status: UpcomingWorkflowStatus): boolean {
  return status === 'completed' || status === 'auto_completed';
}

/** Own review state for a completed request — never exposes the counterparty rating. */
export function resolveCompletedReviewUiState(params: {
  requestId: string;
  reviewerId: string;
  reviews: ServiceReview[];
  pendingRequestIds: ReadonlySet<string>;
}): { state: CompletedReviewUiState; myRating: number | null } {
  const mine = params.reviews.find(
    (r) => r.requestId === params.requestId && r.reviewerId === params.reviewerId,
  );
  if (mine) {
    return { state: 'submitted', myRating: mine.rating };
  }
  if (params.pendingRequestIds.has(params.requestId)) {
    return { state: 'pending', myRating: null };
  }
  return { state: 'pending', myRating: null };
}

export function resolveCompletionTimestamp(
  upcoming: UpcomingJob | undefined,
  myReview: ServiceReview | undefined,
): number | null {
  if (upcoming?.completionRequestedAt) return upcoming.completionRequestedAt;
  if (myReview?.createdAt) return myReview.createdAt;
  if (upcoming?.workflowStatus === 'completed' || upcoming?.workflowStatus === 'auto_completed') {
    return upcoming.createdAt || null;
  }
  return null;
}

export function resolveHiredHelperForCompletedJob(
  job: Job,
  applications: Application[],
  upcomingJobs: UpcomingJob[],
): Application | undefined {
  return findHiredApplicationForJob(job, applications, upcomingJobs);
}
