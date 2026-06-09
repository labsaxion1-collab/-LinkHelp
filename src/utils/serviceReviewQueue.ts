import type { Application } from '@/types/application';
import type { Job } from '@/types/job';
import type { PendingServiceReview, ServiceReview } from '@/types/review';

function hiredApplication(apps: Application[], jobId: string): Application | undefined {
  return apps.find(
    (a) => a.jobId === jobId && (a.status === 'accepted' || a.status === 'completed'),
  );
}

/** Completed jobs where the client still needs to review the hired helper. */
export function buildPendingServiceReviews(
  userId: string,
  role: 'client' | 'helper',
  jobs: Job[],
  applications: Application[],
  reviews: ServiceReview[],
): PendingServiceReview[] {
  if (role !== 'client') return [];

  const reviewedRequestIds = new Set(
    reviews.filter((r) => r.reviewerId === userId).map((r) => r.requestId),
  );
  const pending: PendingServiceReview[] = [];

  for (const job of jobs) {
    if (job.clientId !== userId || job.status !== 'completed') continue;
    if (reviewedRequestIds.has(job.id)) continue;
    const app = hiredApplication(applications, job.id);
    if (!app) continue;
    pending.push({
      requestId: job.id,
      targetUserId: app.helperId,
      targetName: app.helperName,
      targetAvatar: app.helperAvatar,
      jobTitle: job.title,
      jobCategory: job.category,
    });
  }

  return pending;
}
