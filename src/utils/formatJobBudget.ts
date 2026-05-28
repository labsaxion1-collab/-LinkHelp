import type { Job } from '@/types/job';

type BudgetFields = Pick<
  Job,
  'value' | 'budgetType' | 'budgetMin' | 'budgetMax' | 'budgetAmount' | 'currency'
>;

function isNegotiableLabel(value: string): boolean {
  return /negotiable|combinar|agree|convenir|combin|à combinar|to be agreed/i.test(value);
}

/** Display budget on cards — range, single amount, or negotiable. */
export function formatJobBudgetDisplay(job: BudgetFields, t: (key: string) => string): string {
  const currency = job.currency?.trim() || 'CAD';

  if (job.budgetType === 'negotiable') {
    return t('jobs.value_negotiable');
  }

  const min = job.budgetMin ?? null;
  const max = job.budgetMax ?? null;
  const single = job.budgetAmount ?? null;

  if (min != null && min > 0 && max != null && max > 0) {
    if (min === max) return `${currency} $${min}`;
    return `${currency} $${min} - ${max}`;
  }
  if (min != null && min > 0) return `${currency} $${min}+`;
  if (max != null && max > 0) return `${currency} $${max}`;
  if (single != null && single > 0) return `${currency} $${single}`;

  if (job.value?.trim() && !isNegotiableLabel(job.value)) {
    return job.value.trim();
  }

  return t('jobs.value_negotiable');
}

export type BudgetMode = 'unset' | 'fixed' | 'negotiable';

export function buildBudgetLabelFromRange(
  budgetType: BudgetMode,
  min: number | null,
  max: number | null,
  t: (key: string) => string,
  currency = 'CAD',
): string {
  if (budgetType === 'unset') return '';
  if (budgetType === 'negotiable') return t('jobs.value_negotiable');
  if (min != null && min > 0 && max != null && max > 0) {
    if (min === max) return `${currency} $${min}`;
    return `${currency} $${min} - ${max}`;
  }
  if (min != null && min > 0) return `${currency} $${min}+`;
  if (max != null && max > 0) return `${currency} $${max}`;
  return t('jobs.value_negotiable');
}

export function parseBudgetInput(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 6);
}

export function parseBudgetInt(raw: string): number | null {
  const n = Number.parseInt(raw || '', 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}
