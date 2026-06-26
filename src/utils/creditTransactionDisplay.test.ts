import { describe, expect, it } from 'vitest';
import type { CreditTransaction } from '@/types/credits';
import {
  creditTransactionSummaryKey,
  resolveCreditTransactionAmount,
} from '@/utils/creditTransactionDisplay';

const baseTx: CreditTransaction = {
  id: 'tx-1',
  helperId: 'helper-1',
  type: 'APPLICATION_INTEREST',
  amount: 0,
  balanceAfter: 144,
  balanceBefore: 165,
  description: 'Interesse em oportunidade',
  createdAt: Date.now(),
};

describe('resolveCreditTransactionAmount', () => {
  it('preserves negative amounts from real-scale tx.amount', () => {
    expect(
      resolveCreditTransactionAmount({
        ...baseTx,
        amount: -21,
        balanceBefore: null,
        balanceAfter: 144,
      }),
    ).toBe(-21);
  });

  it('falls back to balance_after - balance_before when amount is zero', () => {
    expect(resolveCreditTransactionAmount(baseTx)).toBe(-21);
  });

  it('uses unlock credits_spent when amount and balances are missing', () => {
    expect(
      resolveCreditTransactionAmount(
        { ...baseTx, amount: 0, balanceBefore: null, balanceAfter: 144 },
        { creditsSpent: 13 },
      ),
    ).toBe(-13);
  });

  it('returns positive refund amounts', () => {
    expect(
      resolveCreditTransactionAmount({
        ...baseTx,
        type: 'REFUND',
        amount: 21,
        balanceBefore: 123,
        balanceAfter: 144,
      }),
    ).toBe(21);
  });

  it('maps VIP partial refund summary key', () => {
    expect(
      creditTransactionSummaryKey({
        ...baseTx,
        type: 'VIP_EXCLUSIVE_PARTIAL_REFUND',
        amount: 2,
        balanceBefore: 10,
        balanceAfter: 12,
        description: 'Reembolso parcial por exclusividade VIP',
      }),
    ).toBe('credits_tx.type_vip_partial_refund');
  });
});
