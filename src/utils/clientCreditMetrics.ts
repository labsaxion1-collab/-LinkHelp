import type { ClientCreditLedgerEntry, ClientCreditLedgerType, ClientCreditMetrics } from '@/types/clientCredits';

export function clientCreditLedgerTypeLabelKey(type: ClientCreditLedgerType): string {
  switch (type) {
    case 'FREE_BONUS':
      return 'client_credits.type_free_bonus';
    case 'CREDIT_PURCHASE':
      return 'client_credits.type_credit_purchase';
    case 'OBLIGATION_SETTLEMENT':
      return 'client_credits.type_obligation_settlement';
    case 'REQUEST_PUBLISH':
      return 'client_credits.type_request_publish';
    case 'REQUEST_REFUND':
      return 'client_credits.type_request_refund';
    case 'REQUEST_CANCEL_REFUND':
      return 'client_credits.type_request_cancel_refund';
    case 'MANUAL_ADJUSTMENT':
      return 'client_credits.type_manual_adjustment';
    default:
      return 'client_credits.type_manual_adjustment';
  }
}

const KNOWN_CLIENT_CREDIT_TYPES = new Set<ClientCreditLedgerType>([
  'FREE_BONUS',
  'CREDIT_PURCHASE',
  'REQUEST_PUBLISH',
  'REQUEST_REFUND',
  'REQUEST_CANCEL_REFUND',
  'MANUAL_ADJUSTMENT',
  'OBLIGATION_SETTLEMENT',
]);

export function resolveClientCreditEntryLabel(
  entry: ClientCreditLedgerEntry,
  t: (key: string) => string,
): string {
  if (!KNOWN_CLIENT_CREDIT_TYPES.has(entry.type)) {
    return entry.description?.trim() || entry.type;
  }
  const typeLabel = t(clientCreditLedgerTypeLabelKey(entry.type));
  const desc = entry.description?.trim();
  if (desc && desc !== typeLabel) return desc;
  return typeLabel;
}

export function formatSignedClientCreditAmount(amount: number): string {
  if (amount > 0) return `+${amount}`;
  return String(amount);
}

export function clientCreditAmountClass(amount: number): string {
  if (amount > 0) return 'text-emerald-600';
  if (amount < 0) return 'text-rose-600';
  return 'text-slate-500';
}

export function computeClientCreditMetrics(entries: ClientCreditLedgerEntry[]): ClientCreditMetrics {
  let usedThisMonth = 0;
  let requestsPublishedThisMonth = 0;
  let creditsReturned = 0;

  for (const entry of entries) {
    if (entry.amount < 0) {
      usedThisMonth += Math.abs(entry.amount);
    }

    if (entry.type === 'REQUEST_PUBLISH') {
      requestsPublishedThisMonth += 1;
    }

    if (
      entry.amount > 0 &&
      entry.type !== 'FREE_BONUS' &&
      entry.type !== 'CREDIT_PURCHASE'
    ) {
      creditsReturned += entry.amount;
    }
  }

  return {
    usedThisMonth,
    requestsPublishedThisMonth,
    creditsReturned,
  };
}
