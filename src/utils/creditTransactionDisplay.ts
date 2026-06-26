import type { CreditTransaction, CreditTransactionType, OpportunityUnlock } from '@/types/credits';
import { sanitizeLinkCreditsAmount, sanitizeSignedLinkCreditsAmount } from '@/utils/formatLinkCredits';

const DEBIT_TYPES: CreditTransactionType[] = [
  'APPLICATION_INTEREST',
  'APPLICATION_SELECTED',
  'OPPORTUNITY_UNLOCK',
];

const CREDIT_TYPES: CreditTransactionType[] = [
  'REFUND',
  'CREDIT_PURCHASE',
  'FREE_BONUS',
  'VIP_EXCLUSIVE_PARTIAL_REFUND',
];

export function isCreditTransactionDebitType(type: CreditTransactionType): boolean {
  return DEBIT_TYPES.includes(type);
}

export function resolveCreditTransactionAmount(
  tx: Pick<CreditTransaction, 'amount' | 'balanceBefore' | 'balanceAfter' | 'type'>,
  unlock?: Pick<OpportunityUnlock, 'creditsSpent'> | null,
): number {
  let amount = sanitizeSignedLinkCreditsAmount(tx.amount);

  if (amount === 0 && tx.balanceBefore != null && tx.balanceAfter != null) {
    const delta = tx.balanceAfter - tx.balanceBefore;
    if (delta !== 0) amount = delta;
  }

  if (amount === 0 && unlock?.creditsSpent) {
    amount = -sanitizeLinkCreditsAmount(unlock.creditsSpent);
  }

  if (amount === 0 && tx.type === 'REFUND' && unlock?.creditsSpent) {
    amount = sanitizeLinkCreditsAmount(unlock.creditsSpent);
  }

  if (amount !== 0) return amount;

  if (isCreditTransactionDebitType(tx.type) && unlock?.creditsSpent) {
    return -sanitizeLinkCreditsAmount(unlock.creditsSpent);
  }

  return amount;
}

export function formatSignedCreditAmount(amount: number): string {
  if (amount > 0) return `+${amount}`;
  return String(amount);
}

export function creditTransactionAmountClass(amount: number): string {
  if (amount > 0) return 'text-emerald-400';
  if (amount < 0) return 'text-rose-400';
  return 'text-slate-400';
}

export function findUnlockForTransaction(
  tx: CreditTransaction,
  unlocks: OpportunityUnlock[],
): OpportunityUnlock | undefined {
  if (tx.unlockId) return unlocks.find((u) => u.id === tx.unlockId);
  const opportunityId = tx.requestId ?? tx.relatedOpportunityId;
  if (!opportunityId) return undefined;
  return unlocks.find((u) => u.opportunityId === opportunityId && u.helperId === tx.helperId);
}

export function creditTransactionSummaryKey(
  tx: CreditTransaction,
  options?: { isExclusive?: boolean },
): string {
  if (tx.type === 'REFUND') return 'credits.transaction_refund_no_reply';
  if (tx.type === 'VIP_EXCLUSIVE_PARTIAL_REFUND') return 'credits_tx.type_vip_partial_refund';
  if (tx.type === 'APPLICATION_INTEREST' && options?.isExclusive) {
    return 'credits_tx.type_exclusive_application';
  }
  switch (tx.type) {
    case 'APPLICATION_INTEREST':
      return 'credits_tx.type_application_interest';
    case 'APPLICATION_SELECTED':
      return 'credits_tx.type_application_selected';
    case 'CREDIT_PURCHASE':
      return 'credits_tx.type_purchase';
    case 'FREE_BONUS':
      return 'credits_tx.type_bonus';
    case 'OPPORTUNITY_UNLOCK':
      return 'credits_tx.type_opportunity_unlock';
    case 'ADMIN_ADJUSTMENT':
      return 'credits_tx.type_admin';
    default:
      return tx.description?.trim() ? 'credits_tx.type_unknown_with_desc' : 'credits_tx.type_unknown';
  }
}

export function creditTransactionExplanationKey(
  tx: CreditTransaction,
  options?: { isExclusive?: boolean },
): string {
  if (tx.type === 'APPLICATION_INTEREST' && options?.isExclusive) {
    return 'credits_tx.explain_exclusive_application';
  }
  switch (tx.type) {
    case 'APPLICATION_INTEREST':
      return 'credits_tx.explain_application_interest';
    case 'APPLICATION_SELECTED':
      return 'credits_tx.explain_application_selected';
    case 'REFUND':
      return 'credits_tx.explain_refund';
    case 'VIP_EXCLUSIVE_PARTIAL_REFUND':
      return 'credits_tx.explain_vip_partial_refund';
    case 'CREDIT_PURCHASE':
      return 'credits_tx.explain_purchase';
    case 'FREE_BONUS':
      return 'credits_tx.explain_bonus';
    case 'OPPORTUNITY_UNLOCK':
      return 'credits_tx.explain_opportunity_unlock';
    case 'ADMIN_ADJUSTMENT':
      return 'credits_tx.explain_admin';
    default:
      return 'credits_tx.explain_generic';
  }
}

export function creditTransactionTypeLabelKey(type: CreditTransactionType): string {
  switch (type) {
    case 'APPLICATION_INTEREST':
      return 'credits_tx.label_application_interest';
    case 'APPLICATION_SELECTED':
      return 'credits_tx.label_application_selected';
    case 'REFUND':
      return 'credits_tx.label_refund';
    case 'VIP_EXCLUSIVE_PARTIAL_REFUND':
      return 'credits_tx.label_vip_partial_refund';
    case 'CREDIT_PURCHASE':
      return 'credits_tx.label_purchase';
    case 'FREE_BONUS':
      return 'credits_tx.label_bonus';
    case 'OPPORTUNITY_UNLOCK':
      return 'credits_tx.label_opportunity_unlock';
    case 'ADMIN_ADJUSTMENT':
      return 'credits_tx.label_admin';
    default:
      return 'credits_tx.label_unknown';
  }
}

export function isExclusiveInterestDescription(description: string): boolean {
  return /exclusiv/i.test(description);
}

export function shortTransactionId(id: string): string {
  return id.length > 8 ? id.slice(0, 8) : id;
}

export function requestStatusLabelKey(status: string | null | undefined): string | null {
  if (!status) return null;
  switch (status) {
    case 'open':
      return 'jobs.request_status_open';
    case 'in_progress':
      return 'jobs.request_status_in_progress';
    case 'cancelled':
      return 'credits_tx.request_status_cancelled';
    case 'completed':
      return 'credits_tx.request_status_completed';
    default:
      return null;
  }
}

export function applicationStatusLabelKey(status: string | null | undefined): string | null {
  if (!status) return null;
  switch (status) {
    case 'pending':
      return 'helper_dashboard.app_pending';
    case 'viewed':
      return 'helper_dashboard.app_viewed';
    case 'accepted':
      return 'helper_dashboard.app_accepted';
    case 'rejected':
      return 'helper_dashboard.app_rejected';
    case 'cancelled':
      return 'credits_tx.application_status_cancelled';
    default:
      return null;
  }
}

export function isCreditTypePositive(type: CreditTransactionType): boolean {
  return CREDIT_TYPES.includes(type);
}
