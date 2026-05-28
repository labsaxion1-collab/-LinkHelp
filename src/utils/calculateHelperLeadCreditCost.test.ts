import { describe, expect, it } from 'vitest';
import { calculateHelperLeadCreditCost } from '@/utils/calculateHelperLeadCreditCost';
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

describe('calculateHelperLeadCreditCost', () => {
  it('charges 1 LC interest and clamps selected cost', () => {
    const costs = calculateHelperLeadCreditCost(baseJob({ budgetMin: 60, budgetMax: 80, budgetType: 'fixed' }), {
      distanceKm: 3,
    });
    expect(costs.interestCost).toBe(1);
    expect(costs.selectedCost).toBeGreaterThanOrEqual(2);
    expect(costs.selectedCost).toBeLessThanOrEqual(30);
  });

  it('adds distance surcharge beyond 5km', () => {
    const near = calculateHelperLeadCreditCost(baseJob({ budgetMin: 200, budgetMax: 250, budgetType: 'fixed' }), {
      distanceKm: 4,
    });
    const far = calculateHelperLeadCreditCost(baseJob({ budgetMin: 200, budgetMax: 250, budgetType: 'fixed' }), {
      distanceKm: 25,
    });
    expect(far.selectedCost).toBeGreaterThan(near.selectedCost);
  });
});
