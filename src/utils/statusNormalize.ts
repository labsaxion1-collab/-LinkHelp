import type { ApplicationStatus } from '@/types/application';
import type { JobStatus } from '@/types/job';

const REQUEST_STATUS_ALIASES: Record<string, JobStatus> = {
  open: 'open',
  paused: 'paused',
  pending: 'open',
  matched: 'in_progress',
  scheduled: 'in_progress',
  in_progress: 'in_progress',
  completed: 'completed',
  cancelled: 'cancelled',
  canceled: 'cancelled',
  client_cancelled: 'cancelled',
};

const APPLICATION_STATUS_ALIASES: Record<string, ApplicationStatus> = {
  pending: 'pending',
  interested: 'pending',
  viewed: 'viewed',
  proposed: 'viewed',
  accepted: 'accepted',
  hired: 'accepted',
  rejected: 'rejected',
  cancelled: 'cancelled',
  withdrawn: 'cancelled',
  completed: 'completed',
};

export function normalizeRequestStatus(raw: string | null | undefined): JobStatus {
  const key = (raw ?? 'open').toLowerCase();
  return REQUEST_STATUS_ALIASES[key] ?? 'open';
}

export function normalizeApplicationStatus(raw: string | null | undefined): ApplicationStatus {
  const key = (raw ?? 'pending').toLowerCase();
  return APPLICATION_STATUS_ALIASES[key] ?? 'pending';
}

const TERMINAL_REQUEST_STATUSES = new Set<JobStatus>(['cancelled', 'completed']);

/** Realtime patches must not revert a terminal request status to an active one. */
export function resolveRequestStatusPatch(existing: JobStatus, incoming: JobStatus): JobStatus {
  if (TERMINAL_REQUEST_STATUSES.has(existing) && !TERMINAL_REQUEST_STATUSES.has(incoming)) {
    return existing;
  }
  return incoming;
}

export function isActiveApplicationStatus(status: ApplicationStatus): boolean {
  return status === 'pending' || status === 'viewed' || status === 'accepted';
}
