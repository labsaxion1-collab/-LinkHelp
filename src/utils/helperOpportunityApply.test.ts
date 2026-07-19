import { describe, expect, it } from 'vitest';
import type { Job } from '@/types/job';
import {
  getApplicationTypeChargeLc,
  getApplicationTypeLabelKey,
  getNormalApplicationChargeLc,
  getApplicationBalanceSummary,
  getOpportunityLocationLabel,
  canSubmitConfirmedApplication,
  requiresProposalAmountInput,
  resolveDefaultProposalAmount,
  shouldExpandDescriptionForAmountInput,
  shouldPlaceApplyActionsBelowDescription,
  HELPER_OPPORTUNITY_CARD_FOOTER_LAYOUT,
  type HelperApplicationType,
} from '@/utils/helperOpportunityApply';
import { getApplicationChargeLc } from '@/config/helperCreditCharge';
import { getHelperLeadCreditSummary } from '@/utils/helperCreditDisplay';
import { calculateHelperLeadCreditCost } from '@/utils/calculateHelperLeadCreditCost';
import { getVipApplicationChargeLc, VIP_APPLICATION_SURCHARGE_LC } from '@/utils/vipApplicationCredits';

const baseJob: Job = {
  id: 'job-1',
  title: 'Clean apartment',
  category: 'cleaning',
  subcategory: null,
  description: 'Full clean before move-in',
  date: '2026-07-10',
  location: 'Montreal',
  city: 'Montreal',
  region: 'QC',
  address: '123 Secret St',
  clientId: 'client-1',
  clientName: 'Alex',
  clientAvatar: '',
  status: 'open',
  urgency: 'normal',
  value: 'CAD $120 – $180',
  budgetMin: 120,
  budgetMax: 180,
  budgetType: 'fixed',
  budgetAmount: null,
  currency: 'CAD',
  createdAt: Date.now(),
  applicantCount: 0,
  preferredDate: null,
  preferredTime: null,
  preferredTimeWindow: null,
  preferredPeriod: null,
  timezone: 'America/Toronto',
  createdTimezone: null,
  exclusiveHelperId: null,
};

describe('helperOpportunityApply', () => {
  it('resolves default proposal amount from bounded budget midpoint', () => {
    expect(resolveDefaultProposalAmount(baseJob)).toBe(150);
  });

  it('uses variable normal charge from category + distance breakdown', () => {
    const costs = getHelperLeadCreditSummary(baseJob, 8);
    expect(getNormalApplicationChargeLc(baseJob, 8)).toBe(getApplicationChargeLc(costs));
    expect(getNormalApplicationChargeLc(baseJob, 8)).toBe(costs.estimatedTotal);
    expect(getApplicationTypeChargeLc(baseJob, 'normal', 8)).toBe(costs.estimatedTotal);
  });

  it('different categories produce different normal costs', () => {
    const cleaning = getNormalApplicationChargeLc(baseJob, 3);
    const translation = getNormalApplicationChargeLc(
      { ...baseJob, category: 'translation', title: 'Translate docs' },
      3,
    );
    const moving = getNormalApplicationChargeLc(
      { ...baseJob, category: 'moving', title: 'Move boxes' },
      3,
    );
    expect(cleaning).not.toBe(translation);
    expect(moving).toBeGreaterThan(translation);
    expect(cleaning).toBeGreaterThan(4);
    expect(moving).toBeGreaterThan(4);
  });

  it('does not use global fixed 4 LC normal or 8 LC VIP display amounts', () => {
    const normal = getNormalApplicationChargeLc(baseJob, 8);
    const vip = getApplicationTypeChargeLc(baseJob, 'exclusive', 8);
    expect(normal).not.toBe(4);
    expect(vip).not.toBe(8);
    expect(vip).toBe(normal + VIP_APPLICATION_SURCHARGE_LC);
  });

  it('VIP charge equals normal + 4 LinkCredits', () => {
    const normal = getNormalApplicationChargeLc(baseJob, 8);
    expect(getApplicationTypeChargeLc(baseJob, 'exclusive', 8)).toBe(getVipApplicationChargeLc(normal));
    expect(getApplicationTypeChargeLc(baseJob, 'exclusive', 8)).toBe(normal + VIP_APPLICATION_SURCHARGE_LC);
  });

  it('maps application type label keys consistently', () => {
    expect(getApplicationTypeLabelKey('normal')).toBe('helper_dashboard.apply_type_normal');
    expect(getApplicationTypeLabelKey('exclusive')).toBe('helper_dashboard.apply_type_exclusive');
  });

  it('requires amount input for negotiable jobs without a fixed default', () => {
    const negotiable: Job = {
      ...baseJob,
      budgetMin: null,
      budgetMax: null,
      budgetType: 'negotiable',
      value: 'Negotiable',
    };
    expect(requiresProposalAmountInput(negotiable)).toBe(true);
  });
});

describe('application balance summary', () => {
  it('calculates resulting balances and affordability per type', () => {
    const summary = getApplicationBalanceSummary(baseJob, 30, 8);
    expect(summary.normal.charge).toBe(getNormalApplicationChargeLc(baseJob, 8));
    expect(summary.vip.charge).toBe(getApplicationTypeChargeLc(baseJob, 'exclusive', 8));
    expect(summary.normal.balanceAfter).toBe(30 - summary.normal.charge);
    expect(summary.vip.balanceAfter).toBe(30 - summary.vip.charge);
    expect(summary.normal.canAfford).toBe(true);
    expect(summary.vip.canAfford).toBe(true);
  });

  it('marks only unaffordable action when balance is between normal and VIP', () => {
    const normal = getNormalApplicationChargeLc(baseJob, 8);
    const vip = getApplicationTypeChargeLc(baseJob, 'exclusive', 8);
    const wallet = normal + 1;
    expect(wallet).toBeLessThan(vip);
    const summary = getApplicationBalanceSummary(baseJob, wallet, 8);
    expect(summary.normal.canAfford).toBe(true);
    expect(summary.vip.canAfford).toBe(false);
  });

  it('marks both actions unaffordable when wallet is below normal cost', () => {
    const summary = getApplicationBalanceSummary(baseJob, 2, 8);
    expect(summary.normal.canAfford).toBe(false);
    expect(summary.vip.canAfford).toBe(false);
  });
});

describe('card layout helpers', () => {
  it('uses avatar-description row then separate actions row marker', () => {
    expect(HELPER_OPPORTUNITY_CARD_FOOTER_LAYOUT).toBe('avatar-description-row-then-actions-row');
  });

  it('places apply actions below expanded description content when open', () => {
    expect(shouldPlaceApplyActionsBelowDescription(false)).toBe(false);
    expect(shouldPlaceApplyActionsBelowDescription(true)).toBe(true);
  });
});

describe('apply flow helpers', () => {
  it('expands description when negotiable amount is missing', () => {
    expect(shouldExpandDescriptionForAmountInput(true, '')).toBe(true);
    expect(shouldExpandDescriptionForAmountInput(true, '120')).toBe(false);
    expect(shouldExpandDescriptionForAmountInput(false, '')).toBe(false);
  });

  it('blocks confirm submit while applying or after first submit', () => {
    expect(
      canSubmitConfirmedApplication({
        applicationType: 'normal',
        isApplying: false,
        alreadySubmitted: false,
      }),
    ).toBe(true);
    expect(
      canSubmitConfirmedApplication({
        applicationType: 'normal',
        isApplying: true,
        alreadySubmitted: false,
      }),
    ).toBe(false);
    expect(
      canSubmitConfirmedApplication({
        applicationType: 'normal',
        isApplying: false,
        alreadySubmitted: true,
      }),
    ).toBe(false);
    expect(
      canSubmitConfirmedApplication({
        applicationType: null,
        isApplying: false,
        alreadySubmitted: false,
      }),
    ).toBe(false);
  });
});

describe('privacy-safe location label', () => {
  const t = (key: string, vars?: Record<string, string | number>) => {
    if (key === 'helper_dashboard.distance_km') return `${vars?.km} km`;
    if (key === 'jobs.remote') return 'Remote';
    return key;
  };

  it('shows distance instead of exact address when distance is known', () => {
    const label = getOpportunityLocationLabel(baseJob, 4.2, t);
    expect(label).toBe('4.2 km');
    expect(label).not.toContain(baseJob.address!);
  });

  it('falls back to city and region without exposing street address', () => {
    const label = getOpportunityLocationLabel(baseJob, null, t);
    expect(label).toBe('Montreal, QC');
    expect(label).not.toContain('Secret');
    expect(label).not.toContain('123');
  });
});

describe('application type charge selection', () => {
  it('exclusive charge is normal plus surcharge for variable costs', () => {
    const types: HelperApplicationType[] = ['normal', 'exclusive'];
    for (const type of types) {
      const charge = getApplicationTypeChargeLc(baseJob, type, 12);
      expect(charge).toBeGreaterThan(4);
    }
    const normal = getApplicationTypeChargeLc(baseJob, 'normal', 12);
    const vip = getApplicationTypeChargeLc(baseJob, 'exclusive', 12);
    expect(vip).toBe(normal + VIP_APPLICATION_SURCHARGE_LC);
    expect(normal).toBe(
      calculateHelperLeadCreditCost(baseJob, { distanceKm: 12 }).estimatedTotal,
    );
  });
});
