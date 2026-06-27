import { getSupabase } from '@/lib/supabase';
import type { ClientCreditLedgerRow } from '@/types/database';
import type { ClientCreditLedgerEntry } from '@/types/clientCredits';
import { sanitizeLinkCreditsAmount, sanitizeSignedLinkCreditsAmount } from '@/utils/formatLinkCredits';

function rowToEntry(row: ClientCreditLedgerRow): ClientCreditLedgerEntry {
  return {
    id: row.id,
    clientId: row.client_id,
    type: row.type,
    amount: sanitizeSignedLinkCreditsAmount(row.amount),
    balanceAfter: sanitizeLinkCreditsAmount(row.balance_after),
    rewardType: row.reward_type,
    description: row.description,
    requestId: row.request_id,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}

export function startOfCurrentMonthIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

export async function fetchClientCreditLedger(options?: {
  limit?: number;
  since?: string;
}): Promise<ClientCreditLedgerEntry[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const limit = options?.limit ?? 20;
  let query = sb
    .from('client_credit_ledger')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (options?.since) {
    query = query.gte('created_at', options.since);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[LinkHelp] fetchClientCreditLedger', error);
    return [];
  }

  return ((data ?? []) as ClientCreditLedgerRow[]).map(rowToEntry);
}
