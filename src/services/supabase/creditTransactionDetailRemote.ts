import { getSupabase } from '@/lib/supabase';
import type { CreditTransaction } from '@/types/credits';
import { isExclusiveInterestDescription } from '@/utils/creditTransactionDisplay';

export type CreditTransactionDetailContext = {
  request: {
    id: string;
    title: string;
    category: string;
    status: string;
    clientName: string;
  } | null;
  application: {
    id: string;
    status: string;
    isExclusive: boolean;
  } | null;
};

export async function fetchCreditTransactionDetail(
  tx: CreditTransaction,
): Promise<CreditTransactionDetailContext> {
  const sb = getSupabase();
  if (!sb) return { request: null, application: null };

  const requestId = tx.requestId ?? tx.relatedOpportunityId ?? null;
  let request: CreditTransactionDetailContext['request'] = null;
  let application: CreditTransactionDetailContext['application'] = null;

  if (requestId) {
    const { data, error } = await sb
      .from('requests')
      .select('id, title, category, status, client_id, profiles:client_id ( name )')
      .eq('id', requestId)
      .maybeSingle();

    if (!error && data) {
      const row = data as {
        id: string;
        title: string;
        category: string;
        status: string;
        profiles?: { name?: string | null } | { name?: string | null }[] | null;
      };
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      request = {
        id: row.id,
        title: row.title,
        category: row.category,
        status: row.status,
        clientName: profile?.name?.trim() || 'Cliente',
      };
    }
  }

  if (tx.applicationId) {
    const { data, error } = await sb
      .from('applications')
      .select('id, status, is_exclusive')
      .eq('id', tx.applicationId)
      .maybeSingle();

    if (!error && data) {
      application = {
        id: String(data.id),
        status: String(data.status ?? 'pending'),
        isExclusive: data.is_exclusive === true,
      };
    }
  } else if (requestId && tx.helperId) {
    const { data, error } = await sb
      .from('applications')
      .select('id, status, is_exclusive')
      .eq('request_id', requestId)
      .eq('helper_id', tx.helperId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      application = {
        id: String(data.id),
        status: String(data.status ?? 'pending'),
        isExclusive: data.is_exclusive === true,
      };
    }
  }

  if (
    tx.type === 'APPLICATION_INTEREST' &&
    !application?.isExclusive &&
    isExclusiveInterestDescription(tx.description)
  ) {
    application = application
      ? { ...application, isExclusive: true }
      : { id: tx.applicationId ?? 'unknown', status: 'pending', isExclusive: true };
  }

  return { request, application };
}
