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

/** When the RPC is missing or incompatible, fall back to a direct RLS insert. */
export function shouldFallbackToDirectReviewInsert(error: PostgrestLikeError | null | undefined): boolean {
  if (!error) return false;
  if (isPostgrestMissingResource(error)) return true;

  const blob = errorBlob(error);
  const code = error.code ?? '';

  if (code === '42703' || code === '42883') return true;

  const markers = [
    'submit_service_review',
    'request_not_completed',
    'role_mismatch',
    'criteria_scores',
    'reviewer_role',
    'does not exist',
    'could not find the function',
    'column',
    'undefined_column',
    'function',
  ];

  return markers.some((marker) => blob.includes(marker));
}

export function toReviewSubmitError(error: PostgrestLikeError): ReviewSubmitError {
  const message = error.message?.trim() || 'REVIEW_SUBMIT_FAILED';
  const code = extractReviewErrorCode(message) ?? 'REVIEW_SUBMIT_FAILED';
  return new ReviewSubmitError(message, code);
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

  if (import.meta.env.DEV && error instanceof Error && error.message) {
    return `${t('service_review.submit_error')} (${error.message})`;
  }

  return t('service_review.submit_error');
}
