import { extractErrorMessage } from '@/utils/errorMessage';

type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;

/** Shared mapping for pack 40/50 finance + modality errors. */
export function formatBaselineFinanceError(error: unknown, t: TranslateFn, fallbackKey: string): string {
  const raw = extractErrorMessage(error, '');
  const upper = raw.toUpperCase();

  if (upper.includes('INSUFFICIENT_CREDITS') || upper.includes('INSUFFICIENT_CLIENT_CREDITS')) {
    return t('baseline_finance.insufficient_credits');
  }
  if (upper.includes('ACTIVE_CREDIT_OBLIGATION')) {
    return t('baseline_finance.active_credit_obligation_client');
  }
  if (upper.includes('SERVICE_MODE_REQUIRED')) return t('baseline_finance.service_mode_required');
  if (upper.includes('SERVICE_MODE_NOT_ALLOWED')) return t('baseline_finance.service_mode_not_allowed');
  if (upper.includes('SERVICE_MODE_POLICY_MISSING')) return t('baseline_finance.service_mode_policy_missing');
  if (upper.includes('SERVICE_LOCATION_REQUIRED')) return t('baseline_finance.service_location_required');
  if (upper.includes('REQUEST_SUBCATEGORY_REQUIRED')) return t('baseline_finance.subcategory_required');
  if (upper.includes('LEAD_PRICING_VERSION_MISSING') || upper.includes('LEAD_CATEGORY_PRICE_MISSING')) {
    return t('baseline_finance.pricing_missing');
  }
  if (upper.includes('LEAD_LOCATION_INCOMPLETE')) return t('baseline_finance.location_incomplete_action');
  if (upper.includes('LEAD_SNAPSHOT_MISSING')) return t('baseline_finance.snapshot_missing');
  if (upper.includes('INTEREST_AMOUNT_MISMATCH') || upper.includes('HIRE_CHARGE_MISMATCH')) {
    return t('baseline_finance.charge_mismatch');
  }
  if (upper.includes('EXCLUSIVE_APPLICATION_LOCKED')) return t('baseline_finance.exclusive_locked');
  if (upper.includes('VIP_HIRE_MUST_BE_ZERO') || upper.includes('VIP_HIRE_LOCK')) {
    return t('baseline_finance.vip_hire_invalid');
  }
  if (upper.includes('VIP_LOCK_ACTIVE_NORMAL_HIRE_FORBIDDEN')) {
    return t('baseline_finance.vip_lock_blocks_normal_hire');
  }
  if (upper.includes('APPLICATION_LIMIT_REACHED')) return t('baseline_finance.application_limit');
  if (upper.includes('LEAD_QUOTE_BACKEND_NOT_READY') || upper.includes('APPLICATION_BACKEND_NOT_READY')) {
    return t('baseline_finance.backend_not_ready');
  }

  if (raw.trim()) return raw;
  return t(fallbackKey);
}

/** Stable server code when publish/apply blocked by open credit_obligations (0066). */
export function isActiveCreditObligationError(error: unknown): boolean {
  const raw = extractErrorMessage(error, '');
  return raw.toUpperCase().includes('ACTIVE_CREDIT_OBLIGATION');
}

/** Client-side helper message key for obligation gate (helper RPC). */
export function formatActiveCreditObligationHelperMessage(t: TranslateFn): string {
  return t('baseline_finance.active_credit_obligation_helper');
}
