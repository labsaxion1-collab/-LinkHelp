import { describe, expect, it } from 'vitest';
import { calculateHelperLeadCreditCost } from '@/utils/calculateHelperLeadCreditCost';
import { getHelperCreditPublicDisplay, getExclusiveApplicationChargeLc } from '@/utils/helperCreditDisplay';
import { getApplicationChargeLc } from '@/config/helperCreditCharge';
import { getVipApplicationChargeLc } from '@/utils/vipApplicationCredits';
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
  ...overrides,
});

describe('getHelperCreditPublicDisplay', () => {
  it('uses variable apply cost (estimated total) for candidatura debit', () => {
    const costs = calculateHelperLeadCreditCost(baseJob({ budgetMin: 90, budgetMax: 220, budgetType: 'fixed' }), {
      distanceKm: 8,
    });
    const display = getHelperCreditPublicDisplay(costs);

    expect(display.applyCost).toBe(costs.estimatedTotal);
    expect(display.applyCost).not.toBe(4);
    expect(display.jobCost).toBe(costs.serviceCost + costs.distanceCost);
    expect(display.hireEstimate).toBe(costs.selectedCost);
    expect(display.totalEstimate).toBe(display.applyCost + display.hireEstimate);
    expect(display.chargeOnApply).toBe(getApplicationChargeLc(costs));
    expect(getExclusiveApplicationChargeLc(costs)).toBe(getVipApplicationChargeLc(display.chargeOnApply));
    expect(getExclusiveApplicationChargeLc(costs)).toBe(display.chargeOnApply + 4);
  });
});
