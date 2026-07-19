import { describe, expect, it } from 'vitest';
import {
  getVipApplicationChargeLc,
  getVipPartialRefundLc,
  VIP_APPLICATION_SURCHARGE_LC,
  VIP_DISPLACED_NORMAL_REFUND_LC,
} from '@/utils/vipApplicationCredits';
import { getApplicationChargeLc } from '@/config/helperCreditCharge';
import { calculateHelperLeadCreditCost } from '@/utils/calculateHelperLeadCreditCost';
import { getExclusiveApplicationChargeLc } from '@/utils/helperCreditDisplay';
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
  it('VIP charge equals normal + 4 LinkCredits', () => {
    expect(getVipApplicationChargeLc(4)).toBe(8);
    expect(getVipApplicationChargeLc(12)).toBe(16);
    expect(getVipApplicationChargeLc(20)).toBe(24);
    expect(getVipApplicationChargeLc(4)).toBe(4 + VIP_APPLICATION_SURCHARGE_LC);
  });

  it('VIP partial refund uses ceil(vipCharge / 2)', () => {
    expect(getVipPartialRefundLc(8)).toBe(4);
    expect(getVipPartialRefundLc(16)).toBe(8);
    expect(getVipPartialRefundLc(25)).toBe(13);
  });

  it('displaced normal refund is exactly 2 LC', () => {
    expect(VIP_DISPLACED_NORMAL_REFUND_LC).toBe(2);
  });

  it('exclusive charge from job uses normal lead cost + surcharge, not totalEstimate', () => {
    const costs = calculateHelperLeadCreditCost(baseJob(), { distanceKm: 8 });
    const normal = getApplicationChargeLc(costs);
    expect(getExclusiveApplicationChargeLc(costs)).toBe(getVipApplicationChargeLc(normal));
    expect(getExclusiveApplicationChargeLc(costs)).not.toBe(costs.estimatedTotal);
  });
});
