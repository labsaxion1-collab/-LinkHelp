import type { Application } from '@/types/application';
import type { Job } from '@/types/job';
import type { PendingServiceReview, ServiceReview } from '@/types/review';

function hiredApplication(apps: Application[], jobId: string): Application | undefined {
  return apps.find((a) => a.jobId === jobId && a.status === 'accepted');
}

/** Completed jobs where the current user still needs to leave a review. */
export function buildPendingServiceReviews(
  userId: string,
  role: 'client' | 'helper',
  jobs: Job[],
  applications: Application[],
  reviews: ServiceReview[],
): PendingServiceReview[] {
  const reviewedRequestIds = new Set(
    reviews.filter((r) => r.reviewerId === userId).map((r) => r.requestId),
  );
  const pending: PendingServiceReview[] = [];

  if (role === 'client') {
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

  for (const app of applications) {
    if (app.helperId !== userId) continue;
    const job = jobs.find((j) => j.id === app.jobId);
    if (!job || job.status !== 'completed') continue;
    if (reviewedRequestIds.has(job.id)) continue;
    if (!hiredApplication([app], job.id)) continue;
    pending.push({
      requestId: job.id,
      targetUserId: job.clientId,
      targetName: job.clientName,
      targetAvatar: job.clientAvatar,
      jobTitle: job.title,
      jobCategory: job.category,
    });
  }

  const seen = new Set<string>();
  return pending.filter((p) => {
    if (seen.has(p.requestId)) return false;
    seen.add(p.requestId);
    return true;
  });
}
