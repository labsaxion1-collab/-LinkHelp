import { describe, expect, it } from 'vitest';
import {
  getVipApplicationChargeLc,
  getVipPartialRefundLc,
  VIP_APPLICATION_SURCHARGE_LC,
  VIP_DISPLACED_NORMAL_REFUND_LC,
} from '@/utils/vipApplicationCredits';
import { calculateHelperLeadCreditCost } from '@/utils/calculateHelperLeadCreditCost';
import { getExclusiveApplicationChargeLc } from '@/utils/helperCreditDisplay';
import { getHelperLeadCreditQuote } from '@/utils/helperLeadCreditQuote';
import type { Job } from '@/types/job';

const baseJob = (overrides: Partial<Job> = {}): Job => ({
  id: 'j1',
  clientId: 'c1',
  clientName: 'Client',
  clientAvatar: '',
  title: 'Test',
  category: 'cleaning',
  description: 'Need help',
  date: 'Today',
  location: 'Montreal',
  value: 'CAD $80-120',
  urgency: 'normal',
  status: 'open',
  createdAt: Date.now(),
  budgetMin: 90,
  budgetMax: 220,
  budgetType: 'fixed',
  ...overrides,
});

describe('vipApplicationCredits', () => {
  it('VIP charge helper adds surcharge to base amount', () => {
    expect(getVipApplicationChargeLc(4)).toBe(8);
    expect(getVipApplicationChargeLc(12)).toBe(16);
    expect(getVipApplicationChargeLc(25)).toBe(29);
  });

  it('VIP partial refund uses ceil(vipCharge / 2)', () => {
    expect(getVipPartialRefundLc(8)).toBe(4);
    expect(getVipPartialRefundLc(16)).toBe(8);
    expect(getVipPartialRefundLc(25)).toBe(13);
  });

  it('displaced normal refund is exactly 2 LC', () => {
    expect(VIP_DISPLACED_NORMAL_REFUND_LC).toBe(2);
  });

  it('exclusive charge from job uses fullRequest + surcharge under split charge', () => {
    const quote = getHelperLeadCreditQuote(baseJob(), { distanceKm: 8 });
    expect(quote.normalApplyLc).toBe(4);
    expect(getExclusiveApplicationChargeLc(quote)).toBe(quote.fullRequestLc + VIP_APPLICATION_SURCHARGE_LC);
    expect(getExclusiveApplicationChargeLc(calculateHelperLeadCreditCost(baseJob(), { distanceKm: 8 }))).toBe(
      quote.vipApplyLc,
    );
  });
});
