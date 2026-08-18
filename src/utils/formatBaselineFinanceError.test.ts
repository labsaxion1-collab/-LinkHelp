import { describe, expect, it } from 'vitest';
import { formatBaselineFinanceError } from '@/utils/formatBaselineFinanceError';
import { formatHireError } from '@/utils/formatHireError';
import { normalHireRemainderFromLeadTotal } from '@/services/leadQuoteRemote';

const t = (key: string) => key;

describe('formatBaselineFinanceError', () => {
  it('maps ACTIVE_CREDIT_OBLIGATION to client message', () => {
    expect(formatBaselineFinanceError(new Error('ACTIVE_CREDIT_OBLIGATION'), t, 'fallback')).toBe(
      'baseline_finance.active_credit_obligation_client',
    );
  });

  it('maps LEAD_* and SERVICE_MODE_* codes', () => {
    expect(formatBaselineFinanceError(new Error('SERVICE_MODE_REQUIRED'), t, 'fallback')).toBe(
      'baseline_finance.service_mode_required',
    );
    expect(formatBaselineFinanceError(new Error('LEAD_CATEGORY_PRICE_MISSING'), t, 'fallback')).toBe(
      'baseline_finance.pricing_missing',
    );
    expect(formatBaselineFinanceError(new Error('EXCLUSIVE_APPLICATION_LOCKED'), t, 'fallback')).toBe(
      'baseline_finance.exclusive_locked',
    );
    expect(formatBaselineFinanceError(new Error('VIP_HIRE_MUST_BE_ZERO'), t, 'fallback')).toBe(
      'baseline_finance.vip_hire_invalid',
    );
  });
});

describe('formatHireError baseline bridge', () => {
  it('routes VIP lock and snapshot errors through baseline keys', () => {
    expect(formatHireError(new Error('LEAD_SNAPSHOT_MISSING'), t)).toBe('baseline_finance.snapshot_missing');
    expect(formatHireError(new Error('VIP_LOCK_ACTIVE_NORMAL_HIRE_FORBIDDEN'), t)).toBe(
      'baseline_finance.vip_lock_blocks_normal_hire',
    );
  });

  it('keeps classic hire codes', () => {
    expect(formatHireError(new Error('REQUEST_NOT_HIRABLE'), t)).toBe('hire_modal.request_not_hirable');
  });
});

describe('normalHireRemainderFromLeadTotal', () => {
  it('computes Normal hire remainder from snap total (total − 4)', () => {
    expect(normalHireRemainderFromLeadTotal(24)).toBe(20);
    expect(normalHireRemainderFromLeadTotal(4)).toBe(0);
    expect(normalHireRemainderFromLeadTotal(null)).toBeNull();
  });
});
