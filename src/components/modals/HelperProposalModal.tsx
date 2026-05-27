import { useEffect, useState } from 'react';
import * as Icons from 'lucide-react';
import type { Job } from '@/types/job';
import { LhModal } from '@/components/design-system/LhModal';
import { premium } from '@/components/design-system/premiumClasses';
import { formatBudgetRange, jobHasBoundedBudget, jobIsNegotiableBudget, validateHelperProposal } from '@/utils/jobProposal';

type Props = {
  open: boolean;
  job: Job | null;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (amount: number | null) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

export function HelperProposalModal({ open, job, submitting = false, onClose, onSubmit, t }: Props) {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  const bounded = job ? jobHasBoundedBudget(job) : false;
  const negotiable = job ? jobIsNegotiableBudget(job) : false;
  const required = bounded;

  useEffect(() => {
    if (!open) {
      setAmount('');
      setError('');
    }
  }, [open, job?.id]);

  if (!open || !job) return null;

  const handleSubmit = () => {
    const result = validateHelperProposal(amount, job, required);
    if (!result.ok) {
      setError(t(result.messageKey, result.messageVars));
      return;
    }
    setError('');
    onSubmit(result.amount);
  };

  return (
    <LhModal
      open={open}
      onClose={onClose}
      title={t('helper_proposal.title')}
      size="md"
      className="max-w-md"
      footer={
        <div className="flex w-full gap-2">
          <button type="button" onClick={onClose} disabled={submitting} className={`${premium.btnSecondary} flex-1`}>
            {t('common.cancel')}
          </button>
          <button type="button" onClick={handleSubmit} disabled={submitting} className={`${premium.btnPrimary} flex-1`}>
            {submitting ? (
              <>
                <Icons.Loader2 className="h-4 w-4 animate-spin" />
                {t('helper_dashboard.apply_sending')}
              </>
            ) : (
              t('helper_proposal.submit')
            )}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm font-medium lh-text-muted">{job.title}</p>

        {bounded ? (
          <div className="rounded-2xl border border-[#33B6FF]/20 bg-[#1565FF]/10 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-[#33B6FF]">{t('helper_proposal.client_suggested')}</p>
            <p className="mt-1 text-lg font-black text-white">{formatBudgetRange(job, t)}</p>
          </div>
        ) : negotiable ? (
          <p className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium lh-text-muted">
            {t('helper_proposal.negotiable_hint')}
          </p>
        ) : null}

        <div>
          <label className="mb-2 block text-sm font-bold text-[#F2F4F7]">
            {t('helper_proposal.your_proposal')}
            {!required ? <span className="ml-1 text-xs font-semibold lh-text-muted">({t('helper_proposal.optional')})</span> : null}
          </label>
          <div className="flex min-h-[52px] items-center rounded-xl border-2 border-[#33B6FF]/20 bg-white/[0.04] px-3 focus-within:border-[#1565FF]">
            <span className="mr-2 shrink-0 text-sm font-black text-[#F2F4F7]/70">{job.currency?.trim() || 'CAD'} $</span>
            <input
              inputMode="decimal"
              pattern="[0-9]*"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value.replace(/[^\d.,]/g, ''));
                setError('');
              }}
              placeholder={bounded ? String(Math.round(job.budgetMin!)) : '0'}
              className="min-w-0 flex-1 bg-transparent text-lg font-black text-white outline-none placeholder:text-[#F2F4F7]/35"
              autoFocus
            />
          </div>
          {error ? <p className="mt-2 text-sm font-semibold text-rose-400">{error}</p> : null}
        </div>
      </div>
    </LhModal>
  );
}
