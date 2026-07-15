import { extractErrorMessage } from '@/utils/errorMessage';

type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;

export function formatRequestLifecycleError(error: unknown, t: TranslateFn): string {
  const raw = extractErrorMessage(error, '');
  const upper = raw.toUpperCase();

  if (upper.includes('REQUEST_LIFECYCLE_BACKEND_NOT_READY')) {
    return t('client_dashboard.lifecycle_backend_not_ready');
  }
  if (upper.includes('REQUEST_NOT_PAUSABLE')) {
    return t('client_dashboard.lifecycle_not_pausable');
  }
  if (upper.includes('REQUEST_NOT_PAUSED')) {
    return t('client_dashboard.lifecycle_not_paused');
  }
  if (upper.includes('REQUEST_NOT_CANCELLABLE')) {
    return t('client_dashboard.lifecycle_not_cancellable');
  }
  if (upper.includes('NOT_ALLOWED') || upper.includes('AUTH_REQUIRED')) {
    return t('client_dashboard.lifecycle_not_allowed');
  }
  if (raw.trim()) return raw;
  return t('client_dashboard.lifecycle_error');
}
