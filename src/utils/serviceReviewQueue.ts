import type { Application } from '@/types/application';
import type { Job } from '@/types/job';
import type { PendingServiceReview, ServiceReview } from '@/types/review';
import type { UpcomingJob } from '@/types/upcoming';
import { isOfficiallyCompletedForReview } from '@/utils/upcomingJobsPartition';

function hiredApplication(apps: Application[], jobId: string): Application | undefined {
  return apps.find(
    (a) => a.jobId === jobId && (a.status === 'accepted' || a.status === 'completed'),
  );
}

/** Completed jobs where the user still needs to submit a review (DB reviews = source of truth). */
export function buildPendingServiceReviews(
  userId: string,
  role: 'client' | 'helper',
  jobs: Job[],
  applications: Application[],
  reviews: ServiceReview[],
  upcomingJobs: UpcomingJob[] = [],
): PendingServiceReview[] {
  const reviewedRequestIds = new Set(
    reviews.filter((r) => r.reviewerId === userId).map((r) => r.requestId),
  );
  const pending: PendingServiceReview[] = [];

  if (role === 'client') {
    for (const job of jobs) {
      if (job.clientId !== userId) continue;
      const app = hiredApplication(applications, job.id);
      if (!app) continue;
      if (reviewedRequestIds.has(job.id)) continue;

      const upcoming = upcomingJobs.find((u) => u.jobId === job.id);
      if (!isOfficiallyCompletedForReview(job.status, upcoming?.workflowStatus)) continue;

      pending.push({
        requestId: job.id,
        targetUserId: app.helperId,
        targetName: app.helperName,
        targetAvatar: app.helperAvatar,
        jobTitle: job.title,
        jobCategory: job.category,
        jobSubcategory: job.subcategory,
      });
    }
    return pending;
  }

  for (const job of jobs) {
    const app = applications.find(
      (a) =>
        a.helperId === userId &&
        a.jobId === job.id &&
        (a.status === 'accepted' || a.status === 'completed'),
    );
    if (!app) continue;
    if (reviewedRequestIds.has(job.id)) continue;

    const upcoming = upcomingJobs.find((u) => u.jobId === job.id && u.helperId === userId);
    if (!isOfficiallyCompletedForReview(job.status, upcoming?.workflowStatus)) continue;

    pending.push({
      requestId: job.id,
      targetUserId: job.clientId,
      targetName: job.clientName,
      targetAvatar: job.clientAvatar,
      jobTitle: job.title,
      jobCategory: job.category,
      jobSubcategory: job.subcategory,
    });
  }

  return pending;
}
