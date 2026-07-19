import { describe, expect, it } from 'vitest';
import type { Job } from '@/types/job';
import {
  getApplicationTypeChargeLc,
  getApplicationTypeLabelKey,
  getNormalApplicationChargeLc,
  getApplicationBalanceSummary,
  getApplicationCreditQuote,
  getOpportunityLocationLabel,
  canSubmitConfirmedApplication,
  requiresProposalAmountInput,
  resolveDefaultProposalAmount,
  shouldExpandDescriptionForAmountInput,
  shouldPlaceApplyActionsBelowDescription,
  HELPER_OPPORTUNITY_CARD_FOOTER_LAYOUT,
  type HelperApplicationType,
} from '@/utils/helperOpportunityApply';
import { VIP_APPLICATION_SURCHARGE_LC } from '@/utils/vipApplicationCredits';

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

describe('helperOpportunityApply — split charge', () => {
  it('resolves default proposal amount from bounded budget midpoint', () => {
    expect(resolveDefaultProposalAmount(baseJob)).toBe(150);
  });

  it('normal apply is always 4 LC regardless of category/distance', () => {
    expect(getNormalApplicationChargeLc(baseJob, 8)).toBe(4);
    expect(getNormalApplicationChargeLc({ ...baseJob, category: 'translation' }, 3)).toBe(4);
    expect(getNormalApplicationChargeLc({ ...baseJob, category: 'automotive' }, 25)).toBe(4);
  });

  it('hire remainder equals fullRequest − 4', () => {
    const quote = getApplicationCreditQuote(baseJob, 8);
    expect(quote.normalHireRemainderLc).toBe(quote.fullRequestLc - 4);
    expect(quote.normalApplyLc + quote.normalHireRemainderLc).toBe(quote.fullRequestLc);
  });

  it('VIP charge equals fullRequest + 4', () => {
    const quote = getApplicationCreditQuote(baseJob, 8);
    expect(getApplicationTypeChargeLc(baseJob, 'exclusive', 8)).toBe(quote.vipApplyLc);
    expect(getApplicationTypeChargeLc(baseJob, 'exclusive', 8)).toBe(quote.fullRequestLc + VIP_APPLICATION_SURCHARGE_LC);
  });

  it('categories differ in full request and VIP, not normal apply', () => {
    const cleaning = getApplicationCreditQuote(baseJob, 3);
    const translation = getApplicationCreditQuote({ ...baseJob, category: 'translation' }, 3);
    expect(cleaning.normalApplyLc).toBe(4);
    expect(translation.normalApplyLc).toBe(4);
    expect(cleaning.fullRequestLc).toBeGreaterThan(translation.fullRequestLc);
    expect(getApplicationTypeChargeLc(baseJob, 'exclusive', 3)).toBeGreaterThan(
      getApplicationTypeChargeLc({ ...baseJob, category: 'translation' }, 3),
    );
  });

  it('maps application type label keys consistently', () => {
    expect(getApplicationTypeLabelKey('normal')).toBe('helper_dashboard.apply_type_normal');
    expect(getApplicationTypeLabelKey('exclusive')).toBe('helper_dashboard.apply_type_exclusive');
  });
});

describe('application balance summary', () => {
  it('normal affordability requires only 4 LC; VIP requires full + 4', () => {
    const quote = getApplicationCreditQuote(baseJob, 8);
    const summary = getApplicationBalanceSummary(baseJob, 30, 8);
    expect(summary.normal.charge).toBe(4);
    expect(summary.vip.charge).toBe(quote.vipApplyLc);
    expect(summary.normal.canAfford).toBe(true);
    expect(summary.vip.canAfford).toBe(quote.vipApplyLc <= 30);
  });

  it('marks only VIP unaffordable when balance is between normal and VIP', () => {
    const quote = getApplicationCreditQuote(baseJob, 8);
    const wallet = 5;
    expect(wallet).toBeGreaterThanOrEqual(4);
    expect(wallet).toBeLessThan(quote.vipApplyLc);
    const summary = getApplicationBalanceSummary(baseJob, wallet, 8);
    expect(summary.normal.canAfford).toBe(true);
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

  it('blocks confirm submit while applying or after first submit', () => {
    expect(
      canSubmitConfirmedApplication({ applicationType: 'normal', isApplying: false, alreadySubmitted: false }),
    ).toBe(true);
    expect(
      canSubmitConfirmedApplication({ applicationType: 'normal', isApplying: true, alreadySubmitted: false }),
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
});
