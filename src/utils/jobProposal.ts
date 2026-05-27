import type { Job } from '@/types/job';
import { parseBudgetInt } from '@/utils/formatJobBudget';

export function jobHasBoundedBudget(job: Job): boolean {
  const min = job.budgetMin;
  const max = job.budgetMax;
  return min != null && max != null && min > 0 && max > 0 && min <= max;
}

export function jobIsNegotiableBudget(job: Job): boolean {
  if (job.budgetType === 'negotiable') return true;
  if (jobHasBoundedBudget(job)) return false;
  const hint = job.value?.trim() ?? '';
  return /negotiable|combinar|agree|convenir|à combinar|to be agreed/i.test(hint);
}

export function formatMoneyAmount(amount: number, currency = 'CAD'): string {
  return `${currency} $${Math.round(amount)}`;
}

export function formatBudgetRange(job: Job, t: (key: string, vars?: Record<string, string | number>) => string): string {
  const currency = job.currency?.trim() || 'CAD';
  if (jobHasBoundedBudget(job)) {
    return t('helper_proposal.client_range', {
      min: Math.round(job.budgetMin!),
      max: Math.round(job.budgetMax!),
      currency,
    });
  }
  return t('jobs.value_negotiable');
}

export type ProposalValidation =
  | { ok: true; amount: number | null }
  | { ok: false; messageKey: string; messageVars?: Record<string, string | number> };

export function validateHelperProposal(raw: string, job: Job, required: boolean): ProposalValidation {
  const trimmed = raw.trim();
  if (!trimmed) {
    if (required) {
      return { ok: false, messageKey: 'helper_proposal.error_required' };
    }
    return { ok: true, amount: null };
  }

  const amount = parseBudgetInt(trimmed);
  if (amount == null || amount <= 0) {
    return { ok: false, messageKey: 'helper_proposal.error_invalid' };
  }

  if (jobHasBoundedBudget(job)) {
    const min = Math.round(job.budgetMin!);
    const max = Math.round(job.budgetMax!);
    if (amount < min || amount > max) {
      return {
        ok: false,
        messageKey: 'helper_proposal.error_out_of_range',
        messageVars: { min, max, currency: job.currency?.trim() || 'CAD' },
      };
    }
  }

  return { ok: true, amount };
}
