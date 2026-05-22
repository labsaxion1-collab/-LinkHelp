import type { Job } from '@/types/job';

const hiddenKey = (userId: string) => `linkhelp_hidden_jobs_${userId}`;

export function readHiddenJobIds(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(hiddenKey(userId));
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

export function hideJobForUser(userId: string, jobId: string): void {
  const set = readHiddenJobIds(userId);
  set.add(jobId);
  localStorage.setItem(hiddenKey(userId), JSON.stringify([...set]));
}

/** Hide open jobs after preferred date has passed (client view). */
export function isJobExpired(job: Pick<Job, 'preferredDate' | 'status'>): boolean {
  if (job.status !== 'open' || !job.preferredDate) return false;
  const end = new Date(job.preferredDate);
  end.setHours(23, 59, 59, 999);
  return Date.now() > end.getTime();
}

export function isJobVisibleToClient(
  job: Job,
  hidden: Set<string>,
  options?: { includeHistory?: boolean },
): boolean {
  if (hidden.has(job.id)) return false;
  if (isJobExpired(job) && !options?.includeHistory) return false;
  if (job.status === 'cancelled' && !options?.includeHistory) return false;
  return true;
}
