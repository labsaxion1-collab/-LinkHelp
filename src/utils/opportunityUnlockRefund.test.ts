import { describe, expect, it } from 'vitest';
import {
  computeCreditsUsageSummary,
  isUnlockRefundEligible,
} from '@/utils/opportunityUnlockRefund';
import type { CreditTransaction, OpportunityUnlock } from '@/types/credits';

const baseUnlock = (overrides: Partial<OpportunityUnlock> = {}): OpportunityUnlock => ({
  id: 'u1',
  opportunityId: 'req1',
  helperId: 'h1',
  creditsSpent: 4,
  status: 'pending',
  unlockedAt: Date.now() - 72 * 60 * 60 * 1000,
  refundEligible: false,
  refundStatus: 'none',
  responseDeadline: Date.now() - 24 * 60 * 60 * 1000,
  refundedAt: null,
  createdAt: Date.now() - 72 * 60 * 60 * 1000,
  ...overrides,
});

describe('isUnlockRefundEligible', () => {
  const now = Date.UTC(2026, 5, 12, 12, 0, 0);
  const deadline = now - 60 * 60 * 1000;

  it('returns true when pending, deadline passed, refund_status none', () => {
    expect(
      isUnlockRefundEligible({
        status: 'pending',
        refundStatus: 'none',
        responseDeadlineMs: deadline,
        nowMs: now,
      }),
    ).toBe(true);
  });

  it('returns false before deadline (timezone-safe ms comparison)', () => {
    expect(
      isUnlockRefundEligible({
        status: 'pending',
        refundStatus: 'none',
        responseDeadlineMs: now + 60 * 60 * 1000,
        nowMs: now,
      }),
    ).toBe(false);
  });

  it('returns false when client already responded', () => {
    expect(
      isUnlockRefundEligible({
        status: 'responded',
        refundStatus: 'none',
        responseDeadlineMs: deadline,
        nowMs: now,
      }),
    ).toBe(false);
  });

  it('returns false when refund already processed', () => {
    expect(
      isUnlockRefundEligible({
        status: 'refunded',
        refundStatus: 'processed',
        responseDeadlineMs: deadline,
        nowMs: now,
      }),
    ).toBe(false);
  });

  it('returns false when refund_status is not none', () => {
    expect(
      isUnlockRefundEligible({
        status: 'pending',
        refundStatus: 'pending',
        responseDeadlineMs: deadline,
        nowMs: now,
      }),
    ).toBe(false);
  });
});

describe('computeCreditsUsageSummary', () => {
  it('aggregates interest spent and refunds from ledger', () => {
    const unlocks: OpportunityUnlock[] = [
      baseUnlock({ id: 'u1', status: 'responded' }),
      baseUnlock({ id: 'u2', status: 'pending' }),
      baseUnlock({ id: 'u3', status: 'refunded', refundStatus: 'processed' }),
    ];
    const transactions: CreditTransaction[] = [
      {
        id: 't1',
        helperId: 'h1',
        type: 'APPLICATION_INTEREST',
        amount: -4,
        balanceAfter: 16,
        description: 'Interesse',
        createdAt: 1,
      },
      {
        id: 't2',
        helperId: 'h1',
        type: 'APPLICATION_INTEREST',
        amount: -3,
        balanceAfter: 13,
        description: 'Interesse',
        createdAt: 2,
      },
      {
        id: 't3',
        helperId: 'h1',
        type: 'REFUND',
        amount: 4,
        balanceAfter: 17,
        description: 'Reembolso',
        createdAt: 3,
      },
    ];

    const summary = computeCreditsUsageSummary(unlocks, transactions);
    expect(summary.lcUsed).toBe(7);
    expect(summary.lcReturned).toBe(4);
    expect(summary.leadsUnlocked).toBe(3);
    expect(summary.repliesReceived).toBe(1);
    expect(summary.responseRatePct).toBe(33);
  });
});
