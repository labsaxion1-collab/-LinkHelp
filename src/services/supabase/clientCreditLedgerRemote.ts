import { getSupabase } from '@/lib/supabase';
import type { ClientCreditLedgerRow, RequestRow } from '@/types/database';
import type { ClientCreditLedgerEntry, ClientLedgerRequestDetail } from '@/types/clientCredits';
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

function rowToRequestDetail(row: RequestRow): ClientLedgerRequestDetail {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    subcategory: row.subcategory,
    location: row.location,
    preferredDate: row.preferred_date,
    preferredTime: row.preferred_time,
    preferredPeriod: (row as RequestRow & { preferred_period?: string | null }).preferred_period ?? row.preferred_time_window,
    preferredTimeWindow: row.preferred_time_window,
    budget: row.budget,
    budgetType: row.budget_type,
    budgetAmount: row.budget_amount,
    budgetMin: row.budget_min,
    budgetMax: row.budget_max,
    currency: row.currency,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function fetchClientLedgerRequestDetail(
  requestId: string,
): Promise<ClientLedgerRequestDetail | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const { data, error } = await sb
    .from('requests')
    .select('*')
    .eq('id', requestId)
    .maybeSingle();

  if (error) {
    console.error('[LinkHelp] fetchClientLedgerRequestDetail', error);
    return null;
  }

  if (!data) return null;
  return rowToRequestDetail(data as RequestRow);
}
