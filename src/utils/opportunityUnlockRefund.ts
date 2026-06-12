import type { CreditTransaction, OpportunityUnlock, OpportunityUnlockStatus, UnlockRefundStatus } from '@/types/credits';

export type { OpportunityUnlockStatus, UnlockRefundStatus };

export type UnlockRefundEligibilityInput = {
  status: OpportunityUnlockStatus;
  refundStatus: UnlockRefundStatus;
  responseDeadlineMs: number | null;
  nowMs?: number;
};

/** Mirrors SQL eligibility in process_single_unlock_refund (non-force path). */
export function isUnlockRefundEligible(input: UnlockRefundEligibilityInput): boolean {
  const nowMs = input.nowMs ?? Date.now();
  if (input.status !== 'pending') return false;
  if (input.refundStatus !== 'none') return false;
  if (input.responseDeadlineMs == null) return false;
  return nowMs > input.responseDeadlineMs;
}

export type CreditsUsageSummary = {
  lcUsed: number;
  lcReturned: number;
  responseRatePct: number;
  leadsUnlocked: number;
  repliesReceived: number;
};

export function computeCreditsUsageSummary(
  unlocks: OpportunityUnlock[],
  transactions: CreditTransaction[],
): CreditsUsageSummary {
  const interestSpent = transactions
    .filter((tx) => tx.type === 'APPLICATION_INTEREST' || tx.type === 'OPPORTUNITY_UNLOCK')
    .reduce((sum, tx) => sum + Math.abs(Math.min(0, tx.amount)), 0);

  const lcReturned = transactions
    .filter((tx) => tx.type === 'REFUND')
    .reduce((sum, tx) => sum + Math.max(0, tx.amount), 0);

  const leadsUnlocked = unlocks.length;
  const repliesReceived = unlocks.filter((u) => u.status === 'responded').length;
  const responseRatePct =
    leadsUnlocked > 0 ? Math.round((repliesReceived / leadsUnlocked) * 100) : 0;

  return {
    lcUsed: interestSpent,
    lcReturned,
    responseRatePct,
    leadsUnlocked,
    repliesReceived,
  };
}

export function getLatestRefundTransaction(
  transactions: CreditTransaction[],
): CreditTransaction | null {
  return (
    transactions.find((tx) => tx.type === 'REFUND' && tx.amount > 0) ?? null
  );
}

export function formatUnlockStatusKey(status: OpportunityUnlockStatus): string {
  return `credits_unlock.status_${status}`;
}
