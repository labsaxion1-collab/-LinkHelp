import { describe, expect, it } from 'vitest';
import { computeClientCreditMetrics } from '@/utils/clientCreditMetrics';
import type { ClientCreditLedgerEntry } from '@/types/clientCredits';

function entry(partial: Partial<ClientCreditLedgerEntry> & Pick<ClientCreditLedgerEntry, 'type' | 'amount'>): ClientCreditLedgerEntry {
  return {
    id: partial.id ?? '1',
    clientId: partial.clientId ?? 'c1',
    balanceAfter: partial.balanceAfter ?? 0,
    rewardType: partial.rewardType ?? null,
    description: partial.description ?? null,
    requestId: partial.requestId ?? null,
    metadata: partial.metadata ?? {},
    createdAt: partial.createdAt ?? '2026-06-15T12:00:00.000Z',
    type: partial.type,
    amount: partial.amount,
  };
}

describe('computeClientCreditMetrics', () => {
  it('sums debits, publish count, and positive non-bonus credits', () => {
    const metrics = computeClientCreditMetrics([
      entry({ type: 'FREE_BONUS', amount: 30 }),
      entry({ type: 'REQUEST_PUBLISH', amount: -1 }),
      entry({ type: 'REQUEST_PUBLISH', amount: -1 }),
      entry({ type: 'REQUEST_REFUND', amount: 1 }),
      entry({ type: 'MANUAL_ADJUSTMENT', amount: 2 }),
      entry({ type: 'CREDIT_PURCHASE', amount: 80 }),
      entry({ type: 'OBLIGATION_SETTLEMENT', amount: -2 }),
    ]);

    expect(metrics.usedThisMonth).toBe(4);
    expect(metrics.requestsPublishedThisMonth).toBe(2);
    expect(metrics.creditsReturned).toBe(3);
  });

  it('returns zeros for empty ledger', () => {
    expect(computeClientCreditMetrics([])).toEqual({
      usedThisMonth: 0,
      requestsPublishedThisMonth: 0,
      creditsReturned: 0,
    });
  });
});
