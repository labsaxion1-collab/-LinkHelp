import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { isPostgrestMissingResource } from '@/utils/postgrestErrors';
import type { Job } from '@/types/job';
import { calculateHelperLeadCreditCost } from '@/utils/calculateHelperLeadCreditCost';
import type { CreditTransaction } from '@/types/credits';
import { sanitizeLinkCreditsAmount } from '@/utils/formatLinkCredits';
import { distanceFromHelperBaseToJobKm } from '@/utils/helperBaseLocation';

export class InsufficientCreditsError extends Error {
  readonly code = 'INSUFFICIENT_CREDITS';
  readonly requiredLc: number;

  constructor(requiredLc: number) {
    super('INSUFFICIENT_CREDITS');
    this.requiredLc = requiredLc;
  }
}

export function leadCostsForJob(job: Job, input?: number | null | { distanceKm?: number | null }) {
  const opts =
    typeof input === 'object' && input !== null
      ? input
      : ({ distanceKm: input } as { distanceKm?: number | null });
  return calculateHelperLeadCreditCost(job, opts);
}

export async function fetchHelperBaseDistanceKm(helperId: string, job: Job): Promise<number | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from('profiles')
    .select('helper_base_address, helper_base_city, helper_base_province, helper_base_postal_code, helper_base_lat, helper_base_lng, city, region')
    .eq('id', helperId)
    .maybeSingle();
  if (error) {
    console.warn('[LinkHelp] Could not load helper base distance', error.message);
    return null;
  }
  return distanceFromHelperBaseToJobKm(data as Parameters<typeof distanceFromHelperBaseToJobKm>[0], job);
}

export async function remoteDebitApplicationInterest(
  helperId: string,
  requestId: string,
  amount = 1,
): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error('NO_SUPABASE');
  const { data, error } = await sb.rpc('helper_debit_application_interest', {
    p_helper_id: helperId,
    p_request_id: requestId,
    p_amount: amount,
  });
  if (error) {
    if (error.message?.includes('INSUFFICIENT_CREDITS')) {
      throw new InsufficientCreditsError(amount);
    }
    if (isPostgrestMissingResource(error)) {
      throw new Error('APPLICATION_BACKEND_NOT_READY');
    }
    throw error;
  }
  const row = data as { alreadyCharged?: boolean } | null;
  if (row?.alreadyCharged) return;
}

export async function remoteChargeHelperOnClientHire(applicationId: string, amount: number): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error('NO_SUPABASE');
  const { data, error } = await sb.rpc('charge_helper_on_client_hire', {
    p_application_id: applicationId,
    p_amount: amount,
  });
  if (error) {
    if (error.message?.includes('INSUFFICIENT_CREDITS')) {
      throw new InsufficientCreditsError(amount);
    }
    throw error;
  }
  const row = data as { alreadyCharged?: boolean } | null;
  if (row?.alreadyCharged) return;
}

export async function remoteDebitApplicationSelected(
  helperId: string,
  requestId: string,
  applicationId: string,
  amount: number,
): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error('NO_SUPABASE');
  const { data, error } = await sb.rpc('helper_debit_application_selected', {
    p_helper_id: helperId,
    p_request_id: requestId,
    p_application_id: applicationId,
    p_amount: amount,
  });
  if (error) {
    if (error.message?.includes('INSUFFICIENT_CREDITS')) {
      throw new InsufficientCreditsError(amount);
    }
    throw error;
  }
  const row = data as { alreadyCharged?: boolean } | null;
  if (row?.alreadyCharged) return;
}

export function localDebit(
  wallet: { balance: number; totalSpent: number },
  transactions: CreditTransaction[],
  input: {
    helperId: string;
    type: 'APPLICATION_INTEREST' | 'APPLICATION_SELECTED';
    amount: number;
    requestId: string;
    applicationId?: string;
    description: string;
  },
): { wallet: typeof wallet; transactions: CreditTransaction[] } {
  const already = transactions.some(
    (tx) =>
      tx.requestId === input.requestId &&
      tx.type === input.type &&
      (input.type !== 'APPLICATION_SELECTED' || tx.applicationId === input.applicationId),
  );
  if (already) return { wallet, transactions };

  if (wallet.balance < input.amount) {
    throw new InsufficientCreditsError(input.amount);
  }

  const balanceBefore = wallet.balance;
  const balanceAfter = sanitizeLinkCreditsAmount(balanceBefore - input.amount);
  const tx: CreditTransaction = {
    id: `tx_${input.type}_${input.requestId}_${Date.now()}`,
    helperId: input.helperId,
    type: input.type,
    amount: -input.amount,
    balanceBefore,
    balanceAfter,
    requestId: input.requestId,
    applicationId: input.applicationId ?? null,
    relatedOpportunityId: input.requestId,
    description: input.description,
    createdAt: Date.now(),
  };

  return {
    wallet: {
      ...wallet,
      balance: balanceAfter,
      totalSpent: wallet.totalSpent + input.amount,
    },
    transactions: [tx, ...transactions],
  };
}

export function isRemoteCreditsEnabled(): boolean {
  return isSupabaseConfigured();
}
