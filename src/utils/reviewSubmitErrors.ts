import { isPostgrestMissingResource } from '@/utils/postgrestErrors';

const REVIEW_ERROR_CODES = [
  'ALREADY_REVIEWED',
  'REQUEST_NOT_COMPLETED',
  'NOT_ALLOWED',
  'AUTH_REQUIRED',
  'INVALID_RATING',
  'ROLE_MISMATCH',
  'NOT_FOUND',
] as const;

export type ReviewSubmitErrorCode = (typeof REVIEW_ERROR_CODES)[number] | 'REVIEW_SUBMIT_FAILED';

export class ReviewSubmitError extends Error {
  readonly code: ReviewSubmitErrorCode;

  constructor(message: string, code: ReviewSubmitErrorCode = 'REVIEW_SUBMIT_FAILED') {
    super(message);
    this.name = 'ReviewSubmitError';
    this.code = code;
  }
}

type PostgrestLikeError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
  status?: number;
};

function errorBlob(error: PostgrestLikeError): string {
  return `${error.code ?? ''} ${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`.toLowerCase();
}

export function extractReviewErrorCode(message: string): ReviewSubmitErrorCode | null {
  const upper = message.toUpperCase();
  for (const code of REVIEW_ERROR_CODES) {
    if (upper.includes(code)) return code;
  }
  return null;
}

/**
 * Only fall back when the RPC or review columns are missing/incompatible — never on business-rule errors.
 */
export function shouldFallbackToDirectReviewInsert(error: PostgrestLikeError | null | undefined): boolean {
  if (!error) return false;
  if (isPostgrestMissingResource(error)) return true;

  const blob = errorBlob(error);
  const code = error.code ?? '';

  if (code === '42703' || code === '42883') return true;

  const structuralMarkers = [
    'could not find the function public.submit_service_review',
    'submit_service_review',
    'schema cache',
    'undefined_column',
    'column "criteria_scores"',
    'column "reviewer_role"',
  ];

  return structuralMarkers.some((marker) => blob.includes(marker));
}

export function toReviewSubmitError(error: PostgrestLikeError): ReviewSubmitError {
  const message = error.message?.trim() || 'REVIEW_SUBMIT_FAILED';
  const extracted = extractReviewErrorCode(message);

  if (extracted) {
    return new ReviewSubmitError(message, extracted);
  }

  if (error.code === '23505') {
    return new ReviewSubmitError('ALREADY_REVIEWED', 'ALREADY_REVIEWED');
  }

  if (error.code === '23503') {
    return new ReviewSubmitError(message, 'NOT_FOUND');
  }

  if (error.code === '42501') {
    return new ReviewSubmitError(message, 'NOT_ALLOWED');
  }

  return new ReviewSubmitError(message, 'REVIEW_SUBMIT_FAILED');
}

export function formatReviewSubmitDebugDetail(error: unknown): string | null {
  if (error instanceof ReviewSubmitError) {
    const parts = [error.code, error.message].filter((part) => part && part !== 'REVIEW_SUBMIT_FAILED');
    return parts.length > 0 ? parts.join(': ') : error.code;
  }

  if (error && typeof error === 'object') {
    const row = error as PostgrestLikeError;
    const parts = [row.code, row.message, row.details, row.hint].filter(Boolean);
    if (parts.length > 0) return parts.join(' — ');
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return null;
}

export function logReviewSubmitFailure(
  phase: 'rpc' | 'insert' | 'select',
  error: PostgrestLikeError,
  context?: Record<string, unknown>,
): void {
  console.error('[LinkHelp] submit review failed', {
    phase,
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
    ...context,
  });
}

const REVIEW_ERROR_I18N: Partial<Record<ReviewSubmitErrorCode, string>> = {
  ALREADY_REVIEWED: 'service_review.error_already_reviewed',
  REQUEST_NOT_COMPLETED: 'service_review.error_not_completed',
  NOT_ALLOWED: 'service_review.error_not_allowed',
  AUTH_REQUIRED: 'service_review.error_auth',
  INVALID_RATING: 'service_review.rating_required',
  ROLE_MISMATCH: 'service_review.error_role_mismatch',
  NOT_FOUND: 'service_review.error_not_found',
};

export function resolveReviewSubmitErrorMessage(
  error: unknown,
  t: (key: string) => string,
): string {
  if (error instanceof ReviewSubmitError) {
    const key = REVIEW_ERROR_I18N[error.code];
    if (key) return t(key);
  }

  if (error instanceof Error) {
    const extracted = extractReviewErrorCode(error.message);
    if (extracted) {
      const key = REVIEW_ERROR_I18N[extracted];
      if (key) return t(key);
    }
  }

  const base = t('service_review.submit_error');
  const detail = formatReviewSubmitDebugDetail(error);
  if (detail) {
    console.error('[LinkHelp] review submit surfaced detail', detail);
    return `${base} (${detail.slice(0, 180)})`;
  }

  return base;
}
