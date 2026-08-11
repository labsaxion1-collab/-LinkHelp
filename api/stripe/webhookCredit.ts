import {
  assertStripeLivemodeMatchesDeployTarget,
  isolationPublicErrorMessage,
  type LinkhelpDeployTarget,
} from '../../shared/environmentIsolation.js';
import { resolveCheckoutCreditFromServer, type PurchaseAudience } from './packages.js';

export type WebhookCreditDecision =
  | { action: 'skip'; reason: string }
  | {
      action: 'reject';
      httpStatus: number;
      publicBody: string;
      code: string;
    }
  | {
      action: 'credit';
      audience: PurchaseAudience;
      payload: Record<string, unknown>;
    };

export function decideWebhookCheckoutCredit(input: {
  deployTarget: LinkhelpDeployTarget;
  livemode: boolean;
  paymentStatus?: string | null;
  userId?: string | null;
  packageId?: string | null;
  credits?: string | number | null;
  priceId?: string | null;
  audience?: string | null;
  sessionId?: string | null;
  paymentIntentId?: string | null;
  amountTotal?: number | null;
  currency?: string | null;
}): WebhookCreditDecision {
  const livemodeIssue = assertStripeLivemodeMatchesDeployTarget({
    deployTarget: input.deployTarget,
    livemode: input.livemode,
  });
  if (livemodeIssue) {
    return {
      action: 'reject',
      httpStatus: 409,
      publicBody: isolationPublicErrorMessage(livemodeIssue),
      code: livemodeIssue.code,
    };
  }

  if (input.paymentStatus !== 'paid') {
    return { action: 'skip', reason: 'unpaid' };
  }

  if (!input.userId?.trim()) {
    return {
      action: 'reject',
      httpStatus: 400,
      publicBody: 'Invalid payment metadata',
      code: 'USER_ID_REQUIRED',
    };
  }

  const resolved = resolveCheckoutCreditFromServer({
    packageId: input.packageId,
    credits: input.credits,
    priceId: input.priceId,
    audience: input.audience,
  });

  if (resolved.ok === false) {
    return {
      action: 'reject',
      httpStatus: 400,
      publicBody: 'Invalid payment metadata',
      code: resolved.code,
    };
  }

  return {
    action: 'credit',
    audience: resolved.audience,
    payload: {
      user_id: input.userId.trim(),
      stripe_session_id: input.sessionId,
      stripe_payment_intent_id: input.paymentIntentId,
      package_id: resolved.pkg.id,
      price_id: resolved.pkg.priceId,
      credits: resolved.pkg.credits,
      amount_total: input.amountTotal,
      currency: input.currency ?? resolved.pkg.currency,
      status: 'paid',
    },
  };
}

/** Mirrors RPC alreadyProcessed / alreadyCredited — sequential replay must not add credits again. */
export function creditAlreadyApplied(rpcResult: unknown): boolean {
  if (!rpcResult || typeof rpcResult !== 'object') return false;
  const row = rpcResult as { alreadyProcessed?: unknown; alreadyCredited?: unknown };
  return row.alreadyProcessed === true || row.alreadyCredited === true;
}
