import { getSupabase } from '@/lib/supabase';
import { isBaselineFinanceEnabled } from '@/config/baselineFinance';
import type { Job } from '@/types/job';
import {
  getHelperLeadCreditQuote,
  type HelperLeadCreditQuote,
} from '@/utils/helperLeadCreditQuote';
import { VIP_APPLICATION_SURCHARGE_LC } from '@/utils/vipApplicationCredits';
import { isPostgrestMissingResource } from '@/utils/postgrestErrors';

export type ServerLeadQuoteJson = {
  interestLc?: number;
  serviceCostLc?: number;
  distanceKm?: number;
  distanceCostLc?: number;
  totalLc?: number;
  serviceMode?: string;
};

/**
 * Prefer authoritative RPC when baseline finance is enabled.
 * Falls back to local estimate only when the flag is OFF (historical DB).
 * When baseline is ON and the RPC fails, surfaces the error (no silent finance invent).
 */
export async function resolveHelperLeadCreditQuote(
  job: Job,
  helperId: string,
  options?: { distanceKm?: number | null },
): Promise<HelperLeadCreditQuote> {
  if (!isBaselineFinanceEnabled()) {
    return getHelperLeadCreditQuote(job, options);
  }

  const sb = getSupabase();
  if (!sb) throw new Error('NO_SUPABASE');

  const { data, error } = await sb.rpc('helper_compute_lead_quote', {
    p_request_id: job.id,
    p_helper_id: helperId,
  });

  if (error) {
    if (isPostgrestMissingResource(error)) {
      throw new Error('LEAD_QUOTE_BACKEND_NOT_READY');
    }
    throw new Error(error.message || 'LEAD_QUOTE_FAILED');
  }

  const q = (data ?? {}) as ServerLeadQuoteJson;
  const interestLc = Math.max(0, Math.round(Number(q.interestLc ?? 4)));
  const serviceLc = Math.max(0, Math.round(Number(q.serviceCostLc ?? 0)));
  const distanceLc = Math.max(0, Math.round(Number(q.distanceCostLc ?? 0)));
  const fullRequestLc = Math.max(
    0,
    Math.round(Number(q.totalLc ?? interestLc + serviceLc + distanceLc)),
  );
  const isRemote = q.serviceMode === 'remote' || job.serviceMode === 'remote';

  return {
    interestCost: interestLc,
    applicationCost: interestLc,
    serviceCost: serviceLc,
    distanceCost: distanceLc,
    estimatedTotal: fullRequestLc,
    selectedCost: Math.max(0, fullRequestLc - interestLc),
    total: fullRequestLc,
    serviceValueCad: 0,
    interestLc,
    serviceLc,
    distanceLc,
    fullRequestLc,
    normalApplyLc: interestLc,
    normalHireRemainderLc: Math.max(0, fullRequestLc - interestLc),
    vipApplyLc: fullRequestLc + VIP_APPLICATION_SURCHARGE_LC,
    isRemote,
  };
}

export function normalHireRemainderFromLeadTotal(leadTotalLc: number | null | undefined): number | null {
  if (leadTotalLc == null || !Number.isFinite(Number(leadTotalLc))) return null;
  return Math.max(0, Math.round(Number(leadTotalLc)) - 4);
}
