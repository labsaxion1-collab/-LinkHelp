import { getSupabase } from '@/lib/supabase';
import type { CreditPackage, CreditTransaction, CreditWallet, OpportunityUnlock } from '@/types/credits';
import { CREDIT_PACKAGES } from '@/utils/credits';
import { normalizeLinkCreditsAmount } from '@/utils/formatLinkCredits';

const toMs = (iso: string | null | undefined) => (iso ? new Date(iso).getTime() : Date.now());

function walletFromRow(row: Record<string, unknown>): CreditWallet {
  return {
    id: String(row.id),
    helperId: String(row.helper_id),
    balance: normalizeLinkCreditsAmount(Number(row.balance ?? 0)),
    totalPurchased: normalizeLinkCreditsAmount(Number(row.total_purchased ?? 0)),
    totalBonus: normalizeLinkCreditsAmount(Number(row.total_bonus ?? 0)),
    totalSpent: normalizeLinkCreditsAmount(Number(row.total_spent ?? 0)),
    createdAt: toMs(row.created_at as string),
    updatedAt: toMs(row.updated_at as string),
  };
}

function txFromRow(row: Record<string, unknown>): CreditTransaction {
  return {
    id: String(row.id),
    helperId: String(row.helper_id),
    type: row.type as CreditTransaction['type'],
    amount: normalizeLinkCreditsAmount(Number(row.amount ?? 0)),
    balanceBefore:
      row.balance_before != null ? normalizeLinkCreditsAmount(Number(row.balance_before)) : null,
    balanceAfter: normalizeLinkCreditsAmount(Number(row.balance_after ?? 0)),
    relatedOpportunityId: (row.related_opportunity_id as string | null) ?? null,
    requestId: (row.request_id as string | null) ?? null,
    applicationId: (row.application_id as string | null) ?? null,
    relatedPaymentId: (row.related_payment_id as string | null) ?? null,
    description: String(row.description ?? ''),
    createdAt: toMs(row.created_at as string),
  };
}

function unlockFromRow(row: Record<string, unknown>): OpportunityUnlock {
  return {
    id: String(row.id),
    opportunityId: String(row.opportunity_id),
    helperId: String(row.helper_id),
    creditsSpent: Number(row.credits_spent ?? 0),
    status: (row.status as OpportunityUnlock['status']) ?? 'unlocked',
    unlockedAt: toMs(row.unlocked_at as string),
    refundEligible: Boolean(row.refund_eligible),
    refundedAt: row.refunded_at ? toMs(row.refunded_at as string) : null,
    createdAt: toMs(row.created_at as string),
  };
}

/** Ensures wallet exists server-side and returns current balance. */
export async function getWalletBalance(helperId: string): Promise<number> {
  const sb = getSupabase();
  if (!sb) return 0;
  try {
    const { error: ensureErr } = await sb.rpc('ensure_helper_credit_wallet', { p_helper_id: helperId });
    if (ensureErr) {
      console.warn('[LinkHelp] ensure_helper_credit_wallet', ensureErr.message);
      return 0;
    }
    const { data, error } = await sb.rpc('get_wallet_balance', { p_helper_id: helperId });
    if (error) {
      console.warn('[LinkHelp] get_wallet_balance', error.message);
      return 0;
    }
    return typeof data === 'number' ? normalizeLinkCreditsAmount(data) : 0;
  } catch (e) {
    console.warn('[LinkHelp] getWalletBalance', e);
    return 0;
  }
}

export async function fetchRemoteCreditState(helperId: string): Promise<{
  wallet: CreditWallet | null;
  transactions: CreditTransaction[];
  unlocks: OpportunityUnlock[];
  packages: CreditPackage[];
}> {
  const sb = getSupabase();
  if (!sb) return { wallet: null, transactions: [], unlocks: [], packages: CREDIT_PACKAGES };

  try {
    const { error: ensureErr } = await sb.rpc('ensure_helper_credit_wallet', { p_helper_id: helperId });
    if (ensureErr) {
      console.warn('[LinkHelp] ensure_helper_credit_wallet', ensureErr.message);
      return { wallet: null, transactions: [], unlocks: [], packages: CREDIT_PACKAGES };
    }

    const [{ data: wallet }, { data: transactions }, { data: unlocks }, { data: packages }] = await Promise.all([
      sb.from('credit_wallets').select('*').eq('helper_id', helperId).maybeSingle(),
      sb.from('credit_transactions').select('*').eq('helper_id', helperId).order('created_at', { ascending: false }),
      sb.from('opportunity_unlocks').select('*').eq('helper_id', helperId).order('created_at', { ascending: false }),
      sb.from('credit_packages').select('*').eq('active', true).order('credits', { ascending: true }),
    ]);

    return {
      wallet: wallet ? walletFromRow(wallet as Record<string, unknown>) : null,
      transactions: (transactions ?? []).map((row) => txFromRow(row as Record<string, unknown>)),
      unlocks: (unlocks ?? []).map((row) => unlockFromRow(row as Record<string, unknown>)),
      packages: packages?.length
        ? (packages as Record<string, unknown>[]).map((p) => ({
            id: String(p.id),
            name: String(p.name),
            credits: Number(p.credits),
            priceCad: Number(p.price_cad),
            active: Boolean(p.active),
            highlightLabel: (p.highlight_label as string | null) ?? null,
            createdAt: toMs(p.created_at as string),
          }))
        : CREDIT_PACKAGES,
    };
  } catch (e) {
    console.warn('[LinkHelp] fetchRemoteCreditState', e);
    return { wallet: null, transactions: [], unlocks: [], packages: CREDIT_PACKAGES };
  }
}
