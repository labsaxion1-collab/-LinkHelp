import { describe, expect, it } from 'vitest';
import type { Job } from '@/types/job';
import {
  getApplicationTypeChargeLc,
  getApplicationTypeLabelKey,
  getNormalApplicationChargeLc,
  getOpportunityLocationLabel,
  canSubmitConfirmedApplication,
  requiresProposalAmountInput,
  resolveDefaultProposalAmount,
  shouldExpandDescriptionForAmountInput,
  type HelperApplicationType,
} from '@/utils/helperOpportunityApply';
import { getApplicationChargeLc } from '@/config/helperCreditCharge';
import { getHelperLeadCreditSummary } from '@/utils/helperCreditDisplay';
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

  it('uses authoritative normal charge from helper credit config', () => {
    const costs = getHelperLeadCreditSummary(baseJob, 8);
    expect(getNormalApplicationChargeLc(baseJob, 8)).toBe(getApplicationChargeLc(costs));
    expect(getApplicationTypeChargeLc(baseJob, 'normal', 8)).toBe(getApplicationChargeLc(costs));
  });

  it('VIP charge equals normal + 4 LinkCredits', () => {
    const normal = getNormalApplicationChargeLc(baseJob, 8);
    expect(getApplicationTypeChargeLc(baseJob, 'exclusive', 8)).toBe(getVipApplicationChargeLc(normal));
    expect(getApplicationTypeChargeLc(baseJob, 'exclusive', 8)).toBe(normal + VIP_APPLICATION_SURCHARGE_LC);
  });

  it('does not hardcode a fixed example amount for normal charge', () => {
    const remoteJob: Job = { ...baseJob, location: 'Remote', city: 'Remote' };
    const localNormal = getNormalApplicationChargeLc(baseJob, 8);
    const remoteNormal = getNormalApplicationChargeLc(remoteJob, null);
    expect(localNormal).toBeGreaterThan(0);
    expect(remoteNormal).toBeGreaterThan(0);
    expect(localNormal).not.toBe(12);
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
  it('exclusive charge is normal plus surcharge', () => {
    const types: HelperApplicationType[] = ['normal', 'exclusive'];
    for (const type of types) {
      const charge = getApplicationTypeChargeLc(baseJob, type, 12);
      expect(charge).toBeGreaterThan(0);
    }
    const normal = getApplicationTypeChargeLc(baseJob, 'normal', 12);
    const vip = getApplicationTypeChargeLc(baseJob, 'exclusive', 12);
    expect(vip).toBe(normal + VIP_APPLICATION_SURCHARGE_LC);
  });
});
