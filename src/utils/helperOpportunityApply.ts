import type { Job } from '@/types/job';
import { getApplicationChargeLc } from '@/config/helperCreditCharge';
import { isRemoteJob } from '@/utils/calculateHelperLeadCreditCost';
import { getHelperLeadCreditSummary } from '@/utils/helperCreditDisplay';
import { getVipApplicationChargeLc } from '@/utils/vipApplicationCredits';
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

/** When description accordion opens, apply actions stay below expanded content. */
export function shouldPlaceApplyActionsBelowDescription(descriptionOpen: boolean): boolean {
  return descriptionOpen;
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

/** Normal application charge for a job (authoritative lead/application cost). */
export function getNormalApplicationChargeLc(job: Job, distanceKm?: number | null): number {
  return getApplicationChargeLc(getHelperLeadCreditSummary(job, distanceKm));
}

/** Authoritative LinkCredits debit for the selected application type (same sources as AppDataContext.applyForJob). */
export function getApplicationTypeChargeLc(
  job: Job,
  type: HelperApplicationType,
  distanceKm?: number | null,
): number {
  const normalCharge = getNormalApplicationChargeLc(job, distanceKm);
  if (type === 'exclusive') return getVipApplicationChargeLc(normalCharge);
  return normalCharge;
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
