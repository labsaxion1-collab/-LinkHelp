import type { Job, JobStatus } from '@/types/job';

const CANCELLED_STATUSES = new Set<JobStatus | string>(['cancelled', 'canceled', 'client_cancelled']);

export function isJobCancelled(job: Pick<Job, 'status'>): boolean {
  return CANCELLED_STATUSES.has(job.status);
}

/**
 * Client-side soft hide for requests (remove from list UI only).
 *
 * TODO: Hoje o remover é local por usuário/navegador (localStorage).
 * TODO: Futuro: criar tabela `request_visibility` ou `hidden_requests` com `user_id` + `request_id`
 *       (+ `hidden_at`) e substituir read/hide abaixo por RPC Supabase — sem apagar o pedido no banco.
 */

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
  if (isJobCancelled(job)) return false;
  return true;
}
