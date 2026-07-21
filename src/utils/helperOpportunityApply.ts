import type { Job } from '@/types/job';
import { isRemoteJob } from '@/utils/calculateHelperLeadCreditCost';
import { formatJobBudgetAmount } from '@/utils/formatJobBudget';
import { formatJobScheduleDisplay } from '@/utils/jobDisplay';
import { getHelperLeadCreditQuote } from '@/utils/helperLeadCreditQuote';
import { jobHasBoundedBudget, jobIsNegotiableBudget, isProposalAmountValid } from '@/utils/jobProposal';

type LocationTFn = (key: string, options?: Record<string, string | number>) => string;

export type HelperApplicationType = 'normal' | 'exclusive';

export type ApplicationChargeLine = {
  charge: number;
  balanceAfter: number | null;
  canAfford: boolean;
};

export type ApplicationBalanceSummary = {
  walletBalance: number | null;
  normal: ApplicationChargeLine;
  vip: ApplicationChargeLine;
};

/** Wallet pre-check lines for card accordion and confirm modal (whole LinkCredits only). */
export function getApplicationBalanceSummary(
  job: Job,
  walletBalance: number | null,
  distanceKm?: number | null,
): ApplicationBalanceSummary {
  const normalCharge = getNormalApplicationChargeLc(job, distanceKm);
  const vipCharge = getApplicationTypeChargeLc(job, 'exclusive', distanceKm);
  const balanceAfter = (balance: number | null, charge: number): number | null =>
    balance == null ? null : balance - charge;
  const canAfford = (balance: number | null, charge: number): boolean =>
    balance != null && balance >= charge;

  return {
    walletBalance,
    normal: {
      charge: normalCharge,
      balanceAfter: balanceAfter(walletBalance, normalCharge),
      canAfford: canAfford(walletBalance, normalCharge),
    },
    vip: {
      charge: vipCharge,
      balanceAfter: balanceAfter(walletBalance, vipCharge),
      canAfford: canAfford(walletBalance, vipCharge),
    },
  };
}

/** Closed card uses two footer rows: avatar+description, then separate apply actions. */
export const HELPER_OPPORTUNITY_CARD_FOOTER_LAYOUT = 'avatar-description-row-then-actions-row' as const;

/** Description opens in an overlay — apply actions never move in document flow. */
export function shouldPlaceApplyActionsBelowDescription(_descriptionOpen: boolean): boolean {
  return false;
}

export type OpportunityCardMetaParts = {
  budget: string;
  distance: string | null;
  schedule: string | null;
};

/** Budget segment for compact card meta (e.g. CAD $45–90). */
export function formatOpportunityCardBudgetCompact(job: Job, t: LocationTFn): string {
  const amount = formatJobBudgetAmount(job, t);
  if (amount === t('jobs.budget_not_informed')) return amount;
  return amount.replace(/\s+-\s+/g, '–');
}

/** Distance segment when numeric km is known (e.g. 5 km). */
export function formatOpportunityCardDistanceCompact(
  job: Job,
  distanceKm: number | null | undefined,
): string | null {
  if (isRemoteJob(job)) return null;
  if (distanceKm == null || !Number.isFinite(distanceKm)) return null;
  const km = distanceKm >= 10 ? Math.round(distanceKm) : Math.round(distanceKm * 10) / 10;
  return `${km} km`;
}

/** Schedule/time segment — e.g. "Hoje 09:00". */
export function formatOpportunityCardScheduleCompact(job: Job, t: LocationTFn): string | null {
  const schedule = formatJobScheduleDisplay(job, t);
  if (!schedule?.trim()) return null;
  return schedule.replace(/\s*·\s*/g, ' ');
}

export function buildOpportunityCardMetaParts(
  job: Job,
  t: LocationTFn,
  distanceKm?: number | null,
): OpportunityCardMetaParts {
  return {
    budget: formatOpportunityCardBudgetCompact(job, t),
    distance: formatOpportunityCardDistanceCompact(job, distanceKm),
    schedule: formatOpportunityCardScheduleCompact(job, t),
  };
}

/** Single compact meta line: CAD $45–90 · 5 km · 08:00 */
export function formatOpportunityCardMetaLine(parts: OpportunityCardMetaParts): string {
  return [parts.budget, parts.distance, parts.schedule].filter(Boolean).join(' · ');
}

/** Default proposal amount when the helper applies from the compact card flow. */
export function resolveDefaultProposalAmount(job: Job): number | null {
  if (jobHasBoundedBudget(job)) {
    return Math.round((job.budgetMin! + job.budgetMax!) / 2);
  }
  if (job.budgetMin != null && job.budgetMin > 0) return Math.round(job.budgetMin);
  if (job.budgetMax != null && job.budgetMax > 0) return Math.round(job.budgetMax);
  if (job.budgetAmount != null && job.budgetAmount > 0) return Math.round(job.budgetAmount);
  return null;
}

export function requiresProposalAmountInput(job: Job): boolean {
  return resolveDefaultProposalAmount(job) == null || jobIsNegotiableBudget(job);
}

/** Normal application charge for a job (4 LC at apply under split charge). */
export function getNormalApplicationChargeLc(job: Job, distanceKm?: number | null): number {
  return getHelperLeadCreditQuote(job, { distanceKm }).normalApplyLc;
}

/** Authoritative LinkCredits debit for the selected application type. */
export function getApplicationTypeChargeLc(
  job: Job,
  type: HelperApplicationType,
  distanceKm?: number | null,
): number {
  const quote = getHelperLeadCreditQuote(job, { distanceKm });
  return type === 'exclusive' ? quote.vipApplyLc : quote.normalApplyLc;
}

/** Split-charge quote for UI and preview mismatch checks. */
export function getApplicationCreditQuote(job: Job, distanceKm?: number | null) {
  return getHelperLeadCreditQuote(job, { distanceKm });
}

export function getApplicationTypeLabelKey(type: HelperApplicationType): string {
  return type === 'exclusive'
    ? 'helper_dashboard.apply_type_exclusive'
    : 'helper_dashboard.apply_type_normal';
}

/** Returns true when negotiable amount must be collected before confirming apply. */
export function shouldExpandDescriptionForAmountInput(
  requiresAmountInput: boolean,
  amountRaw: string,
): boolean {
  return requiresAmountInput && !isProposalAmountValid(amountRaw);
}

/** Gate for confirm-modal submit (prevents duplicate RPC calls). */
export function canSubmitConfirmedApplication(params: {
  applicationType: HelperApplicationType | null;
  isApplying: boolean;
  alreadySubmitted: boolean;
}): boolean {
  return params.applicationType != null && !params.isApplying && !params.alreadySubmitted;
}

/** Privacy-safe location line for opportunity cards (distance or city/region — never exact address). */
export function getOpportunityLocationLabel(
  job: Job,
  distanceKm: number | null | undefined,
  t: LocationTFn,
  distanceFromBase?: boolean,
  needsBaseAddress?: boolean,
  baseAddressPendingCoords?: boolean,
): string {
  if (isRemoteJob(job)) return t('jobs.remote');
  if (needsBaseAddress) return t('helper_dashboard.base_address_missing_short');
  if (baseAddressPendingCoords) return t('helper_dashboard.base_address_saved_pending_coords');
  if (distanceKm != null) {
    return distanceFromBase
      ? t('helper_dashboard.distance_from_base_km', { km: distanceKm.toFixed(1) })
      : t('helper_dashboard.distance_km', { km: distanceKm.toFixed(1) });
  }
  const parts = [job.city?.trim(), job.region?.trim()].filter(Boolean);
  if (parts.length) return parts.join(', ');
  const loc = job.location?.trim();
  if (!loc || /remot|remote|en ligne|online/i.test(loc)) return t('jobs.remote');
  return loc.length > 28 ? `${loc.slice(0, 26)}…` : loc;
}
