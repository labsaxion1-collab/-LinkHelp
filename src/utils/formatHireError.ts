import { extractErrorMessage } from '@/utils/errorMessage';

type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;

export function formatHireError(error: unknown, t: TranslateFn): string {
  const raw = extractErrorMessage(error, '');
  const upper = raw.toUpperCase();

  if (upper.includes('INSUFFICIENT_CREDITS')) {
    return t('hire_modal.helper_insufficient_credits');
  }
  if (upper.includes('NOT_ALLOWED')) {
    return t('hire_modal.not_allowed');
  }
  if (upper.includes('APPLICATION_NOT_FOUND') || upper.includes('NOT_FOUND')) {
    return t('hire_modal.application_not_found');
  }
  if (upper.includes('APPLICATION_MISMATCH')) {
    return t('hire_modal.application_mismatch');
  }
  if (upper.includes('APPLICATION_NOT_ACTIVE')) {
    return t('hire_modal.application_not_active');
  }
  if (upper.includes('REQUEST_NOT_HIRABLE')) {
    return t('hire_modal.request_not_hirable');
  }
  if (raw.trim()) return raw;
  return t('hire_modal.error_toast');
}

export function formatRejectApplicationError(error: unknown, t: TranslateFn): string {
  const raw = extractErrorMessage(error, '');
  const upper = raw.toUpperCase();

  if (upper.includes('NOT_ALLOWED') || upper.includes('AUTH_REQUIRED')) {
    return t('client_dashboard.reject_not_allowed');
  }
  if (upper.includes('INVALID_STATUS') || upper.includes('APPLICATION_NOT_ACTIVE')) {
    return t('client_dashboard.reject_invalid_status');
  }
  if (upper.includes('NOT_FOUND')) {
    return t('client_dashboard.reject_not_found');
  }
  if (raw.trim()) return raw;
  return t('client_dashboard.reject_error_toast');
}

export function logAcceptProposalError(context: Record<string, unknown>, error: unknown): void {
  console.log('[Accept proposal] requestId', context.requestId);
  console.log('[Accept proposal] applicationId', context.applicationId);
  console.log('[Accept proposal] helperId', context.helperId);
  console.log('[Accept proposal] proposedAmount', context.proposedAmount);
  console.error('[Accept proposal] supabase error', error);
}
