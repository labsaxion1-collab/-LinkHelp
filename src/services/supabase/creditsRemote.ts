import { getSupabase } from '@/lib/supabase';
import type { CreditPackage, CreditTransaction, CreditWallet, OpportunityUnlock } from '@/types/credits';
import { CREDIT_PACKAGES } from '@/utils/credits';
import { sanitizeLinkCreditsAmount, sanitizeSignedLinkCreditsAmount } from '@/utils/formatLinkCredits';
import { isPostgrestMissingResource } from '@/utils/postgrestErrors';

function warnUnlessMissing(label: string, error: { message?: string; code?: string; status?: number } | null): void {
  if (!error || isPostgrestMissingResource(error)) return;
  console.warn(`[LinkHelp] ${label}`, error.message);
}

const toMs = (iso: string | null | undefined) => (iso ? new Date(iso).getTime() : Date.now());

function walletFromRow(row: Record<string, unknown>): CreditWallet {
  return {
    id: String(row.id),
    helperId: String(row.helper_id),
    balance: sanitizeLinkCreditsAmount(Number(row.balance ?? 0)),
    totalPurchased: sanitizeLinkCreditsAmount(Number(row.total_purchased ?? 0)),
    totalBonus: sanitizeLinkCreditsAmount(Number(row.total_bonus ?? 0)),
    totalSpent: sanitizeLinkCreditsAmount(Number(row.total_spent ?? 0)),
    createdAt: toMs(row.created_at as string),
    updatedAt: toMs(row.updated_at as string),
  };
}

function txFromRow(row: Record<string, unknown>): CreditTransaction {
  return {
    id: String(row.id),
    helperId: String(row.helper_id),
    type: row.type as CreditTransaction['type'],
    amount: sanitizeSignedLinkCreditsAmount(Number(row.amount ?? 0)),
    balanceBefore:
      row.balance_before != null ? sanitizeLinkCreditsAmount(Number(row.balance_before)) : null,
    balanceAfter: sanitizeLinkCreditsAmount(Number(row.balance_after ?? 0)),
    relatedOpportunityId: (row.related_opportunity_id as string | null) ?? null,
    requestId: (row.request_id as string | null) ?? null,
    applicationId: (row.application_id as string | null) ?? null,
    unlockId: (row.unlock_id as string | null) ?? null,
    relatedPaymentId: (row.related_payment_id as string | null) ?? null,
    description: String(row.description ?? ''),
    createdAt: toMs(row.created_at as string),
  };
}

function unlockFromRow(row: Record<string, unknown>): OpportunityUnlock {
  const rawStatus = String(row.status ?? 'pending');
  const status = (
    rawStatus === 'unlocked' ? 'pending' : rawStatus
  ) as OpportunityUnlock['status'];

  return {
    id: String(row.id),
    opportunityId: String(row.opportunity_id),
    helperId: String(row.helper_id),
    creditsSpent: Number(row.credits_spent ?? 0),
    status,
    unlockedAt: toMs(row.unlocked_at as string),
    refundEligible: Boolean(row.refund_eligible),
    refundStatus: (row.refund_status as OpportunityUnlock['refundStatus']) ?? 'none',
    responseDeadline: row.response_deadline ? toMs(row.response_deadline as string) : null,
    applicationId: (row.application_id as string | null) ?? null,
    refundedAt: row.refunded_at ? toMs(row.refunded_at as string) : null,
    createdAt: toMs(row.created_at as string),
  };
}

/** Bootstrap wallet via SECURITY DEFINER RPC only (client upsert violates RLS). */
async function ensureHelperWalletRow(helperId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb || !helperId) return;

  const { error: ensureErr } = await sb.rpc('ensure_helper_credit_wallet', { p_helper_id: helperId });
  warnUnlessMissing('ensure_helper_credit_wallet', ensureErr);
}

/**
 * Loads balance for the authenticated helper from credit_wallets.
 * Creates a zero-balance row when missing (when RLS/RPC allows).
 */
export async function loadHelperWalletBalance(helperId: string): Promise<number> {
  const sb = getSupabase();
  if (!sb || !helperId) return 0;

  console.log('[wallet] currentUserId', helperId);

  await ensureHelperWalletRow(helperId);

  const { data, error } = await sb
    .from('credit_wallets')
    .select('balance')
    .eq('helper_id', helperId)
    .maybeSingle();

  if (error) {
    console.warn('[LinkHelp] credit_wallets balance select', error.message);
    return 0;
  }

  if (!data) return 0;

  return sanitizeLinkCreditsAmount(Number(data.balance ?? 0));
}

/** Full wallet row for the logged-in helper. */
export async function fetchHelperWallet(helperId: string): Promise<CreditWallet | null> {
  const sb = getSupabase();
  if (!sb || !helperId) return null;

  await ensureHelperWalletRow(helperId);

  const { data, error } = await sb.from('credit_wallets').select('*').eq('helper_id', helperId).maybeSingle();

  if (error) {
    warnUnlessMissing('credit_wallets select', error);
    const balance = await loadHelperWalletBalance(helperId);
    const now = Date.now();
    return {
      id: `wallet_${helperId}`,
      helperId,
      balance,
      totalPurchased: 0,
      totalBonus: 0,
      totalSpent: 0,
      createdAt: now,
      updatedAt: now,
    };
  }

  if (!data) {
    const balance = await loadHelperWalletBalance(helperId);
    const now = Date.now();
    return {
      id: `wallet_${helperId}`,
      helperId,
      balance,
      totalPurchased: 0,
      totalBonus: 0,
      totalSpent: 0,
      createdAt: now,
      updatedAt: now,
    };
  }

  const wallet = walletFromRow(data as Record<string, unknown>);
  console.log('[wallet] loaded balance', wallet.balance);
  return wallet;
}

/** @deprecated Prefer loadHelperWalletBalance / fetchHelperWallet */
export async function getWalletBalance(helperId: string): Promise<number> {
  return loadHelperWalletBalance(helperId);
}

export async function fetchRemoteCreditState(helperId: string): Promise<{
  wallet: CreditWallet | null;
  transactions: CreditTransaction[];
  unlocks: OpportunityUnlock[];
  packages: CreditPackage[];
}> {
  const sb = getSupabase();
  if (!sb || !helperId) {
    return { wallet: null, transactions: [], unlocks: [], packages: CREDIT_PACKAGES };
  }

  const wallet = await fetchHelperWallet(helperId);

  const [transactionsRes, unlocksRes, packagesRes] = await Promise.all([
    sb.from('credit_transactions').select('*').eq('helper_id', helperId).order('created_at', { ascending: false }),
    sb.from('opportunity_unlocks').select('*').eq('helper_id', helperId).order('created_at', { ascending: false }),
    sb.from('credit_packages').select('*').eq('active', true).order('credits', { ascending: true }),
  ]);

  warnUnlessMissing('credit_transactions select', transactionsRes.error);
  warnUnlessMissing('opportunity_unlocks select', unlocksRes.error);
  warnUnlessMissing('credit_packages select', packagesRes.error);

  const packages = packagesRes.data?.length
    ? (packagesRes.data as Record<string, unknown>[]).map((p) => ({
        id: String(p.id),
        name: String(p.name),
        credits: Number(p.credits),
        priceCad: Number(p.price_cad),
        active: Boolean(p.active),
        highlightLabel: (p.highlight_label as string | null) ?? null,
        createdAt: toMs(p.created_at as string),
      }))
    : CREDIT_PACKAGES;

  return {
    wallet,
    transactions: (transactionsRes.data ?? []).map((row) => txFromRow(row as Record<string, unknown>)),
    unlocks: (unlocksRes.data ?? []).map((row) => unlockFromRow(row as Record<string, unknown>)),
    packages,
  };
}
