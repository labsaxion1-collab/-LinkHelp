import { describe, expect, it } from 'vitest';
import { calculateHelperLeadCreditCost } from '@/utils/calculateHelperLeadCreditCost';
import { getHelperCreditPublicDisplay, getExclusiveApplicationChargeLc } from '@/utils/helperCreditDisplay';
import { getApplicationChargeLc } from '@/config/helperCreditCharge';
import { VIP_APPLICATION_SURCHARGE_LC } from '@/utils/vipApplicationCredits';
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
  it('uses split charge: 4 LC apply, remainder on hire, full total', () => {
    const costs = calculateHelperLeadCreditCost(baseJob({ budgetMin: 90, budgetMax: 220, budgetType: 'fixed' }), {
      distanceKm: 8,
    });
    const display = getHelperCreditPublicDisplay(costs);

    expect(display.applyCost).toBe(4);
    expect(display.hireEstimate).toBe(costs.estimatedTotal - 4);
    expect(display.totalEstimate).toBe(costs.estimatedTotal);
    expect(display.chargeOnApply).toBe(getApplicationChargeLc(costs));
    expect(getExclusiveApplicationChargeLc(costs)).toBe(costs.estimatedTotal + VIP_APPLICATION_SURCHARGE_LC);
    expect(display.applyCost + display.hireEstimate).toBe(display.totalEstimate);
  });
});
