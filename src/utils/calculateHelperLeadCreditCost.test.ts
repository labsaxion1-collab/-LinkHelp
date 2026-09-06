import { describe, expect, it } from 'vitest';
import { calculateHelperLeadCreditCost } from '@/utils/calculateHelperLeadCreditCost';
import { getApplicationChargeLc } from '@/config/helperCreditCharge';
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
  it('charges 4 LC interest and builds estimated total from service + distance', () => {
    const costs = calculateHelperLeadCreditCost(baseJob({ budgetMin: 60, budgetMax: 80, budgetType: 'fixed' }), {
      distanceKm: 3,
    });
    expect(costs.interestCost).toBe(4);
    expect(costs.serviceCost).toBe(7);
    expect(costs.distanceCost).toBe(0);
    expect(costs.estimatedTotal).toBe(11);
    expect(costs.selectedCost).toBeGreaterThanOrEqual(2);
    expect(costs.selectedCost).toBeLessThanOrEqual(30);
  });

  it('adds distance cost to estimated total beyond 5km', () => {
    const near = calculateHelperLeadCreditCost(baseJob(), { distanceKm: 4 });
    const far = calculateHelperLeadCreditCost(baseJob(), { distanceKm: 12 });
    expect(far.distanceCost).toBeGreaterThan(near.distanceCost);
    expect(far.estimatedTotal).toBeGreaterThan(near.estimatedTotal);
    expect(getApplicationChargeLc(far)).toBe(4);
    expect(getApplicationChargeLc(near)).toBe(4);
  });

  it('varies estimated total by category service cost', () => {
    const cleaning = calculateHelperLeadCreditCost(baseJob({ category: 'cleaning' }), { distanceKm: 3 });
    const translation = calculateHelperLeadCreditCost(baseJob({ category: 'translation' }), { distanceKm: 3 });
    expect(cleaning.estimatedTotal).toBeGreaterThan(translation.estimatedTotal);
  });

  it('keeps remote distance cost at zero regardless of a numeric km hint', () => {
    const remote = calculateHelperLeadCreditCost(
      baseJob({ serviceMode: 'remote', location: 'Remote' }),
      { distanceKm: 40 },
    );
    expect(remote.distanceCost).toBe(0);
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
