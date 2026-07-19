import { describe, expect, it } from 'vitest';
import type { Job } from '@/types/job';
import { getHelperLeadCreditQuote } from '@/utils/helperLeadCreditQuote';
import { VIP_APPLICATION_SURCHARGE_LC } from '@/utils/vipApplicationCredits';

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

describe('helperLeadCreditQuote — split charge', () => {
  it('cleaning: normal apply 4, remainder = full − 4, VIP = full + 4', () => {
    const quote = getHelperLeadCreditQuote(baseJob({ category: 'cleaning' }), { distanceKm: 8 });
    expect(quote.interestLc).toBe(4);
    expect(quote.fullRequestLc).toBe(4 + 7 + 1);
    expect(quote.normalApplyLc).toBe(4);
    expect(quote.normalHireRemainderLc).toBe(quote.fullRequestLc - 4);
    expect(quote.vipApplyLc).toBe(quote.fullRequestLc + VIP_APPLICATION_SURCHARGE_LC);
  });

  it('translation: lower service cost, same split rule', () => {
    const quote = getHelperLeadCreditQuote(baseJob({ category: 'translation' }), { distanceKm: 3 });
    expect(quote.serviceLc).toBe(3);
    expect(quote.normalApplyLc).toBe(4);
    expect(quote.normalHireRemainderLc).toBe(quote.fullRequestLc - 4);
    expect(quote.normalApplyLc + quote.normalHireRemainderLc).toBe(quote.fullRequestLc);
  });

  it('automotive: higher service cost at distance', () => {
    const quote = getHelperLeadCreditQuote(baseJob({ category: 'automotive' }), { distanceKm: 25 });
    expect(quote.serviceLc).toBe(8);
    expect(quote.distanceLc).toBeGreaterThan(0);
    expect(quote.normalApplyLc).toBe(4);
    expect(quote.vipApplyLc).toBe(quote.fullRequestLc + 4);
  });

  it('remote jobs ignore distance in full request cost', () => {
    const quote = getHelperLeadCreditQuote(
      baseJob({ category: 'translation', location: 'Remote / online' }),
      { distanceKm: 40 },
    );
    expect(quote.isRemote).toBe(true);
    expect(quote.distanceLc).toBe(0);
    expect(quote.fullRequestLc).toBe(7);
  });
});
