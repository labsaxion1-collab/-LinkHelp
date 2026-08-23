import type { Job, JobStatus } from '@/types/job';
import { isJobCancelled, isJobExpired } from '@/utils/jobVisibility';

/** Mutually exclusive presentation buckets for client activities vs history. */
export type ClientRequestBucket = 'waiting' | 'in_progress' | 'closed' | 'completed';

export type ClientHistoryDiagnostic = {
  kind: 'unknown_job_status';
  status: string;
  jobId: string;
};

export type ClientHistoryPartition = {
  waiting: Job[];
  inProgress: Job[];
  closed: Job[];
  completed: Job[];
  diagnostics: ClientHistoryDiagnostic[];
};

const KNOWN_JOB_STATUSES = new Set<string>([
  'open',
  'paused',
  'in_progress',
  'completed',
  'cancelled',
  'expired',
]);

function sanitizeStatus(raw: unknown): string {
  const s = String(raw ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 32);
  return s || 'empty';
}

/**
 * Authoritative client request classification for Activities vs History.
 *
 * - completed → completed services (history)
 * - cancelled → closed (history)
 * - expired status OR open/paused with expiresAt/legacy expiry → closed (history)
 * - in_progress → activities
 * - open/paused not expired → waiting (activities)
 * - expiresAt wins over preferredDate (via isJobExpired)
 * - in_progress / completed / cancelled are never reclassified by dates
 * - One job never appears in two buckets
 */
export function classifyClientRequest(job: Job, now = Date.now()): ClientRequestBucket | 'unknown' {
  const status = String(job.status ?? '').toLowerCase() as JobStatus | string;

  if (status === 'completed') return 'completed';
  if (isJobCancelled(job) || status === 'cancelled') return 'closed';
  if (status === 'expired' || isJobExpired(job, now)) return 'closed';
  if (status === 'in_progress') return 'in_progress';
  if (status === 'open' || status === 'paused') return 'waiting';
  return 'unknown';
}

export function partitionClientRequests(input: {
  jobs: Job[];
  clientId: string;
  hiddenJobIds?: ReadonlySet<string>;
  now?: number;
}): ClientHistoryPartition {
  const now = input.now ?? Date.now();
  const hidden = input.hiddenJobIds ?? new Set<string>();
  const waiting: Job[] = [];
  const inProgress: Job[] = [];
  const closed: Job[] = [];
  const completed: Job[] = [];
  const diagnostics: ClientHistoryDiagnostic[] = [];

  for (const job of input.jobs) {
    if (job.clientId !== input.clientId) continue;
    if (hidden.has(job.id)) continue;

    const bucket = classifyClientRequest(job, now);
    if (bucket === 'waiting') waiting.push(job);
    else if (bucket === 'in_progress') inProgress.push(job);
    else if (bucket === 'closed') closed.push(job);
    else if (bucket === 'completed') completed.push(job);
    else {
      const status = sanitizeStatus(job.status);
      if (!KNOWN_JOB_STATUSES.has(status)) {
        diagnostics.push({ kind: 'unknown_job_status', status, jobId: job.id });
      }
      // Keep unknown visible in closed history rather than dropping.
      closed.push(job);
    }
  }

  const byNewest = (a: Job, b: Job) => (b.createdAt ?? 0) - (a.createdAt ?? 0);
  waiting.sort(byNewest);
  inProgress.sort(byNewest);
  closed.sort(byNewest);
  completed.sort(byNewest);

  return { waiting, inProgress, closed, completed, diagnostics };
}

export function isClientClosedHistoryJob(job: Job, now = Date.now()): boolean {
  return classifyClientRequest(job, now) === 'closed';
}

export function isClientCompletedHistoryJob(job: Job, now = Date.now()): boolean {
  return classifyClientRequest(job, now) === 'completed';
}
