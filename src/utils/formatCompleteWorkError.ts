import { extractErrorMessage } from '@/utils/errorMessage';

type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;

/**
 * Maps service-completion RPC / handler errors to specific PT/EN/FR copy.
 * Never invents statuses — only surfaces known remote codes.
 */
export function formatCompleteWorkError(error: unknown, t: TranslateFn): string {
  const raw = extractErrorMessage(error, '');
  const upper = raw.toUpperCase();

  if (
    upper.includes('FINALIZE_RPC_NOT_DEPLOYED') ||
    upper.includes('MARK_AWAITING_RPC_NOT_DEPLOYED') ||
    upper.includes('COMPLETION_BACKEND_NOT_READY')
  ) {
    return t('upcoming_jobs.complete_work_backend_missing');
  }
  if (upper.includes('AUTH_REQUIRED')) {
    return t('upcoming_jobs.complete_work_auth_required');
  }
  if (upper.includes('NOT_ALLOWED')) {
    return t('upcoming_jobs.complete_work_not_allowed');
  }
  if (upper.includes('REQUEST_NOT_IN_PROGRESS')) {
    return t('upcoming_jobs.complete_work_not_in_progress');
  }
  if (upper.includes('NO_ACTIVE_UPCOMING_JOB') || upper.includes('WORKFLOW_NOT_ACTIVE')) {
    return t('upcoming_jobs.complete_work_no_active_job');
  }
  if (upper.includes('REQUEST_CANCELLED')) {
    return t('upcoming_jobs.complete_work_cancelled');
  }
  if (upper.includes('SERVICE_NOT_AWAITING_CONFIRMATION')) {
    return t('upcoming_jobs.complete_work_not_awaiting');
  }
  if (upper.includes('CLIENT_COMPLETE_REQUIRES_FINALIZE_RPC')) {
    return t('upcoming_jobs.complete_work_backend_missing');
  }
  if (upper.includes('NOT_FOUND') || upper.includes('REQUEST_NOT_FOUND')) {
    return t('upcoming_jobs.complete_work_not_found');
  }
  if (raw.trim()) {
    return t('upcoming_jobs.complete_work_error_with_code', { code: raw.trim().slice(0, 120) });
  }
  return t('upcoming_jobs.complete_work_error');
}
