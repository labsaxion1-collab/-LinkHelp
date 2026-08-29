import type { Job, JobStatus } from '@/types/job';

const CANCELLED_STATUSES = new Set<JobStatus | string>(['cancelled', 'canceled', 'client_cancelled']);

export function isJobCancelled(job: Pick<Job, 'status'>): boolean {
  return CANCELLED_STATUSES.has(job.status);
}

export function isJobPaused(job: Pick<Job, 'status'>): boolean {
  return job.status === 'paused';
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

type ExpirationFields = Pick<Job, 'preferredDate' | 'status' | 'expiresAt'>;

/**
 * Authoritative request listing expiration for UI presentation.
 *
 * Contract (migrations 0060 expires_at + 0062 status expired):
 * 1. status === 'expired' → expired (even if expiresAt is missing)
 * 2. expiresAt <= now → expired for presentation while cron has not flipped status yet
 * 3. Legacy fallback only when expiresAt is absent: preferredDate day-end passed on open/paused
 *
 * preferredDate is the client's requested service day — NOT the 7-day listing TTL.
 * open + past preferredDate + future expiresAt must stay active.
 * Hired / completed / cancelled jobs are not reclassified as expired via dates.
 */
export function isJobExpired(job: ExpirationFields, now = Date.now()): boolean {
  if (job.status === 'expired') return true;
  if (
    job.status === 'completed' ||
    job.status === 'cancelled' ||
    job.status === 'in_progress'
  ) {
    return false;
  }

  if (job.expiresAt != null && Number.isFinite(job.expiresAt)) {
    return now >= job.expiresAt;
  }

  // Legacy pre-0060 rows without expires_at — preferredDate day end only.
  if ((job.status === 'open' || job.status === 'paused') && job.preferredDate) {
    const end = new Date(job.preferredDate);
    end.setHours(23, 59, 59, 999);
    return now > end.getTime();
  }

  return false;
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
