import { describe, expect, it } from 'vitest';
import {
  extractReviewErrorCode,
  formatReviewSubmitDebugDetail,
  resolveReviewSubmitErrorMessage,
  ReviewSubmitError,
  shouldFallbackToDirectReviewInsert,
  toReviewSubmitError,
} from '@/utils/reviewSubmitErrors';

describe('shouldFallbackToDirectReviewInsert', () => {
  it('falls back when RPC is missing', () => {
    expect(
      shouldFallbackToDirectReviewInsert({
        code: 'PGRST202',
        message: 'Could not find the function public.submit_service_review',
      }),
    ).toBe(true);
  });

  it('falls back when criteria_scores column is missing in RPC', () => {
    expect(
      shouldFallbackToDirectReviewInsert({
        code: '42703',
        message: 'column "criteria_scores" of relation "reviews" does not exist',
      }),
    ).toBe(true);
  });

  it('does not fall back for REQUEST_NOT_COMPLETED', () => {
    expect(
      shouldFallbackToDirectReviewInsert({
        code: 'P0001',
        message: 'REQUEST_NOT_COMPLETED',
      }),
    ).toBe(false);
  });

  it('does not fall back for ROLE_MISMATCH', () => {
    expect(
      shouldFallbackToDirectReviewInsert({
        code: 'P0001',
        message: 'ROLE_MISMATCH',
      }),
    ).toBe(false);
  });

  it('does not fall back for NOT_ALLOWED', () => {
    expect(
      shouldFallbackToDirectReviewInsert({
        code: 'P0001',
        message: 'NOT_ALLOWED',
      }),
    ).toBe(false);
  });

  it('does not fall back for ALREADY_REVIEWED', () => {
    expect(
      shouldFallbackToDirectReviewInsert({
        code: 'P0001',
        message: 'ALREADY_REVIEWED',
      }),
    ).toBe(false);
  });
});

describe('extractReviewErrorCode', () => {
  it('extracts known codes from postgres messages', () => {
    expect(extractReviewErrorCode('ERROR: ALREADY_REVIEWED')).toBe('ALREADY_REVIEWED');
    expect(extractReviewErrorCode('REQUEST_NOT_COMPLETED')).toBe('REQUEST_NOT_COMPLETED');
  });
});

describe('toReviewSubmitError', () => {
  it('maps postgres exception text to ReviewSubmitError code', () => {
    const err = toReviewSubmitError({ message: 'NOT_ALLOWED' });
    expect(err.code).toBe('NOT_ALLOWED');
  });

  it('maps unique violation to ALREADY_REVIEWED', () => {
    const err = toReviewSubmitError({ code: '23505', message: 'duplicate key value' });
    expect(err.code).toBe('ALREADY_REVIEWED');
  });
});

describe('resolveReviewSubmitErrorMessage', () => {
  const t = (key: string) => key;

  it('surfaces debug detail for unknown failures', () => {
    const message = resolveReviewSubmitErrorMessage(
      new ReviewSubmitError('relation "request_review_rewards" does not exist', 'REVIEW_SUBMIT_FAILED'),
      t,
    );
    expect(message).toContain('service_review.submit_error');
    expect(message).toContain('request_review_rewards');
  });
});

describe('formatReviewSubmitDebugDetail', () => {
  it('formats ReviewSubmitError with code', () => {
    expect(formatReviewSubmitDebugDetail(new ReviewSubmitError('NOT_ALLOWED', 'NOT_ALLOWED'))).toBe(
      'NOT_ALLOWED: NOT_ALLOWED',
    );
  });
});
