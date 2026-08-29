import { describe, expect, it } from 'vitest';
import { formatJobBudgetAmount } from '@/utils/formatJobBudget';

describe('formatJobBudgetAmount', () => {
  const t = (key: string) => (key === 'jobs.budget_not_informed' ? 'Não informado' : key);

  it('shows min and max in full when both exist', () => {
    expect(
      formatJobBudgetAmount(
        {
          value: 'CAD $80 - ...',
          budgetType: 'fixed',
          budgetMin: 80,
          budgetMax: 180,
          budgetAmount: null,
          currency: 'CAD',
        },
        t,
      ),
    ).toBe('CAD $80–180');
  });

  it('does not invent a max when only min exists', () => {
    expect(
      formatJobBudgetAmount(
        {
          value: '',
          budgetType: 'fixed',
          budgetMin: 80,
          budgetMax: null,
          budgetAmount: null,
          currency: 'CAD',
        },
        t,
      ),
    ).toBe('CAD $80+');
  });
});
