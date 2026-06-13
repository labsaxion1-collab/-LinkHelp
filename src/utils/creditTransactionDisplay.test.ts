import { describe, expect, it } from 'vitest';
import type { CreditTransaction } from '@/types/credits';
import { resolveCreditTransactionAmount } from '@/utils/creditTransactionDisplay';

const baseTx: CreditTransaction = {
  id: 'tx-1',
  helperId: 'helper-1',
  type: 'APPLICATION_INTEREST',
  amount: 0,
  balanceAfter: 31185,
  balanceBefore: 31206,
  description: 'Interesse em oportunidade',
  createdAt: Date.now(),
};

describe('resolveCreditTransactionAmount', () => {
  it('preserves negative amounts after signed normalization', () => {
    expect(
      resolveCreditTransactionAmount({
        ...baseTx,
        amount: -21,
        balanceBefore: null,
        balanceAfter: 31185,
      }),
    ).toBe(-21);
  });

  it('falls back to balance_after - balance_before when amount is zero', () => {
    expect(resolveCreditTransactionAmount(baseTx)).toBe(-21);
  });

  it('uses unlock credits_spent when amount and balances are missing', () => {
    expect(
      resolveCreditTransactionAmount(
        { ...baseTx, amount: 0, balanceBefore: null, balanceAfter: 31185 },
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
        balanceBefore: 31164,
        balanceAfter: 31185,
      }),
    ).toBe(21);
  });
});
