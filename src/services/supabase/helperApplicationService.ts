import { getSupabase } from '@/lib/supabase';
import { InsufficientCreditsError, remoteDebitApplicationInterest } from '@/services/helperLeadCredits';
import { remoteApply } from '@/services/supabase/appDataRemote';
import { isPostgrestMissingResource } from '@/utils/postgrestErrors';

export type SubmitHelperApplicationInput = {
  requestId: string;
  helperId: string;
  clientId: string;
  message?: string | null;
  proposedAmount?: number | null;
  /** LinkCredits debited once per helper+request (0 skips debit). */
  interestCost?: number;
};

export type SubmitHelperApplicationResult = {
  applicationId: string;
  conversationId: string | null;
  created: boolean;
};

type RpcSubmitRow = {
  applicationId?: string;
  conversationId?: string | null;
  created?: boolean;
  alreadyExists?: boolean;
};

function mapRpcError(error: { message?: string }, interestCost: number): never {
  const msg = error.message ?? '';
  if (msg.includes('INSUFFICIENT_CREDITS')) {
    throw new InsufficientCreditsError(Math.max(1, interestCost));
  }
  if (msg.includes('SELF_REQUEST')) throw new Error('SELF_REQUEST');
  if (msg.includes('NOT_ALLOWED') || msg.includes('AUTH_REQUIRED')) throw new Error('NOT_ALLOWED');
  if (msg.includes('REQUEST_NOT_OPEN')) throw new Error('JOB_NOT_OPEN');
  if (msg.includes('APPLICATION_LIMIT_REACHED')) throw new Error('APPLICATION_LIMIT_REACHED');
  throw new Error(msg || 'APPLICATION_SUBMIT_FAILED');
}

async function submitViaRpc(
  input: SubmitHelperApplicationInput,
): Promise<SubmitHelperApplicationResult | null> {
  const sb = getSupabase();
  if (!sb) throw new Error('NO_SUPABASE');

  const interest = Math.max(0, Math.round(input.interestCost ?? 1));
  const { data, error } = await sb.rpc('helper_submit_application', {
    p_request_id: input.requestId,
    p_helper_id: input.helperId,
    p_client_id: input.clientId,
    p_message: input.message ?? null,
    p_proposed_amount: input.proposedAmount ?? null,
    p_interest_amount: interest,
  });

  if (error) {
    if (isPostgrestMissingResource(error)) return null;
    mapRpcError(error, interest);
  }

  const row = (data ?? {}) as RpcSubmitRow;
  if (row.alreadyExists) throw new Error('ALREADY_APPLIED');
  const applicationId = row.applicationId;
  if (!applicationId) throw new Error('APPLICATION_SUBMIT_FAILED');

  return {
    applicationId,
    conversationId: row.conversationId ?? null,
    created: row.created !== false,
  };
}

async function submitViaLegacy(input: SubmitHelperApplicationInput): Promise<SubmitHelperApplicationResult> {
  const interest = Math.max(0, Math.round(input.interestCost ?? 1));
  if (interest > 0) {
    await remoteDebitApplicationInterest(input.helperId, input.requestId, interest);
  }

  const applyResult = await remoteApply({
    requestId: input.requestId,
    helperId: input.helperId,
    clientId: input.clientId,
    message: input.message ?? null,
    proposedAmount: input.proposedAmount ?? null,
  });

  if (applyResult.outcome === 'already_exists') {
    throw new Error('ALREADY_APPLIED');
  }

  return {
    applicationId: '',
    conversationId: null,
    created: true,
  };
}

/**
 * Single entry point for helper candidatura (web, PWA, all apply buttons).
 * Prefers atomic RPC; falls back to debit + insert + conversation when RPC is not deployed.
 */
export async function submitHelperApplication(
  input: SubmitHelperApplicationInput,
): Promise<SubmitHelperApplicationResult> {
  const sb = getSupabase();
  if (!sb) throw new Error('NO_SUPABASE');

  if (input.clientId === input.helperId) {
    throw new Error('SELF_REQUEST');
  }

  const rpcResult = await submitViaRpc(input);
  if (rpcResult) return rpcResult;

  try {
    return await submitViaLegacy(input);
  } catch (err: unknown) {
    const postgrestErr =
      err && typeof err === 'object' && ('code' in err || 'message' in err)
        ? (err as { code?: string; message?: string; status?: number })
        : null;
    if (isPostgrestMissingResource(postgrestErr)) {
      throw new Error('APPLICATION_BACKEND_NOT_READY');
    }
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('INSUFFICIENT_CREDITS')) {
      throw new InsufficientCreditsError(Math.max(1, Math.round(input.interestCost ?? 1)));
    }
    throw err;
  }
}
