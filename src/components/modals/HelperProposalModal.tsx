import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import * as Icons from 'lucide-react';
import { clsx } from 'clsx';
import type { Job } from '@/types/job';
import type { AppLanguage } from '@/services/translationService';
import { formatBudgetRange, jobHasBoundedBudget, jobIsNegotiableBudget, validateHelperProposal } from '@/utils/jobProposal';
import { getHelperLeadCreditSummary } from '@/utils/helperCreditDisplay';
import { formatLinkCredits } from '@/utils/formatLinkCredits';

type Props = {
  open: boolean;
  job: Job | null;
  submitting?: boolean;
  creditBalance?: number | null;
  onClose: () => void;
  onSubmit: (amount: number | null, message?: string | null) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  language?: AppLanguage;
  distanceKm?: number | null;
};

export function HelperProposalModal({
  open,
  job,
  submitting = false,
  creditBalance = null,
  onClose,
  onSubmit,
  t,
  language = 'pt',
  distanceKm,
}: Props) {
  const [amount, setAmount] = useState('');
  const [proposalMessage, setProposalMessage] = useState('');
  const [error, setError] = useState('');
  const [keyboardInset, setKeyboardInset] = useState(0);

  const bounded = job ? jobHasBoundedBudget(job) : false;
  const negotiable = job ? jobIsNegotiableBudget(job) : false;
  const required = bounded;

  useEffect(() => {
    if (!open) {
      setAmount('');
      setProposalMessage('');
      setError('');
    }
  }, [open, job?.id]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const sync = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardInset(inset > 48 ? inset : 0);
    };
    vv.addEventListener('resize', sync);
    vv.addEventListener('scroll', sync);
    sync();
    return () => {
      vv.removeEventListener('resize', sync);
      vv.removeEventListener('scroll', sync);
    };
  }, [open]);

  if (!open || !job) return null;

  const handleSubmit = () => {
    if (submitting) return;
    const result = validateHelperProposal(amount, job, required);
    if (!result.ok) {
      setError(t(result.messageKey, result.messageVars));
      return;
    }
    setError('');
    const trimmed = proposalMessage.trim();
    onSubmit(result.amount, trimmed || null);
  };

  const currency = job.currency?.trim() || 'CAD';
  const costs = getHelperLeadCreditSummary(job, distanceKm);
  const balanceLabel =
    creditBalance == null ? '…' : formatLinkCredits(creditBalance, language);

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center p-0 sm:p-4"
      style={{ paddingBottom: keyboardInset > 0 ? keyboardInset : undefined }}
      role="presentation"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-[#0D1B2A]/55 backdrop-blur-lg" aria-hidden />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="helper-proposal-title"
        className={clsx(
          'relative z-10 flex w-full max-w-md flex-col overflow-hidden',
          'rounded-t-[1.85rem] sm:rounded-[1.85rem]',
          'border border-sky-100/80 bg-gradient-to-b from-white/95 via-[#F4FAFF]/95 to-[#E8F4FF]/95',
          'shadow-[0_-12px_48px_rgba(21,101,255,0.18),0_28px_72px_rgba(13,27,42,0.22)]',
          'backdrop-blur-xl sm:ring-1 sm:ring-blue-400/20',
          'max-h-[min(92dvh,680px)]',
          'animate-[helperProposalIn_0.45s_cubic-bezier(0.34,1.45,0.64,1)]',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-2.5 h-1 w-11 shrink-0 rounded-full bg-sky-200/90 sm:hidden" aria-hidden />

        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-sky-100/70 px-5 pb-4 pt-4 sm:pt-5">
          <div className="min-w-0">
            <h2 id="helper-proposal-title" className="text-xl font-black tracking-tight text-slate-950">
              {t('helper_proposal.title')}
            </h2>
            <p className="mt-1 truncate text-sm font-bold text-blue-700">{job.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-sky-100 bg-white/90 text-slate-500 shadow-sm transition hover:bg-white hover:text-slate-900 active:scale-95"
            aria-label={t('common.close')}
          >
            <Icons.X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          <div className="mb-4 rounded-2xl border border-blue-200/70 bg-white/70 px-4 py-3.5 shadow-sm shadow-blue-500/5 backdrop-blur-sm">
            <p className="text-[10px] font-black uppercase tracking-wider text-blue-700">
              {t('helper_proposal.job_section')}
            </p>
            <ul className="mt-2 space-y-1.5 text-sm font-bold text-slate-800">
              <li className="flex justify-between gap-2">
                <span className="text-slate-600">{t('helper_proposal.interest_line')}</span>
                <span className="tabular-nums text-blue-800">{costs.applicationCost} LC</span>
              </li>
              <li className="flex justify-between gap-2">
                <span className="text-slate-600">{t('helper_proposal.service_line')}</span>
                <span className="tabular-nums text-blue-800">{costs.serviceCost} LC</span>
              </li>
              <li className="flex justify-between gap-2">
                <span className="text-slate-600">{t('helper_proposal.distance_line')}</span>
                <span className="tabular-nums text-blue-800">{costs.distanceCost} LC</span>
              </li>
              <li className="flex justify-between gap-2 border-t border-sky-100/80 pt-2">
                <span className="text-slate-600">{t('helper_proposal.total_line')}</span>
                <span className="tabular-nums text-blue-900">{costs.estimatedTotal} LC</span>
              </li>
              <li className="flex justify-between gap-2 text-xs font-semibold text-blue-700/90">
                <span>{t('helper_proposal.selected_line')}</span>
                <span className="tabular-nums">+{costs.selectedCost} LC</span>
              </li>
              <li className="flex justify-between gap-2 border-t border-sky-100/80 pt-2">
                <span className="text-slate-600">{t('helper_proposal.balance_line')}</span>
                <span className="tabular-nums text-slate-950">{balanceLabel}</span>
              </li>
            </ul>
          </div>

          {bounded ? (
            <div className="mb-4 rounded-2xl border border-blue-200/80 bg-gradient-to-r from-blue-50/90 to-sky-50/90 px-4 py-3.5 backdrop-blur-sm">
              <p className="text-[10px] font-black uppercase tracking-wider text-blue-700">
                {t('helper_proposal.client_suggested')}
              </p>
              <p className="mt-1 text-xl font-black text-slate-900">{formatBudgetRange(job, t)}</p>
            </div>
          ) : negotiable ? (
            <p className="mb-4 rounded-2xl border border-sky-100 bg-white/75 px-4 py-3.5 text-sm font-medium leading-relaxed text-slate-600 backdrop-blur-sm">
              {t('helper_proposal.negotiable_hint')}
            </p>
          ) : null}

          <label className="mb-2 block text-sm font-bold text-slate-800">
            {t('helper_proposal.your_proposal')}
            {!required ? (
              <span className="ml-1 text-xs font-semibold text-slate-500">({t('helper_proposal.optional')})</span>
            ) : null}
          </label>
          <div className="flex min-h-[60px] items-center rounded-2xl border-2 border-blue-200/70 bg-white/95 px-4 shadow-inner shadow-blue-500/5 backdrop-blur-sm focus-within:border-[#1565FF] focus-within:ring-4 focus-within:ring-blue-500/15">
            <span className="mr-2 shrink-0 text-base font-black text-slate-500">{currency} $</span>
            <input
              type="text"
              inputMode="decimal"
              pattern="[0-9]*"
              autoComplete="off"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value.replace(/[^\d.,]/g, ''));
                setError('');
              }}
              placeholder={bounded ? String(Math.round(job.budgetMin!)) : '0'}
              className="min-w-0 flex-1 bg-transparent text-2xl font-black text-slate-950 outline-none placeholder:text-slate-300"
              autoFocus
            />
          </div>
          {error ? <p className="mt-2 text-sm font-semibold text-rose-600">{error}</p> : null}

          <label className="mb-2 mt-4 block text-sm font-bold text-slate-800">
            {t('helper_proposal.message_label')}
            <span className="ml-1 text-xs font-semibold text-slate-500">({t('helper_proposal.optional')})</span>
          </label>
          <textarea
            value={proposalMessage}
            onChange={(e) => setProposalMessage(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder={t('helper_proposal.message_placeholder')}
            className="w-full resize-none rounded-2xl border-2 border-sky-100/90 bg-white/90 px-4 py-3 text-sm font-medium text-slate-800 shadow-inner shadow-blue-500/5 outline-none backdrop-blur-sm transition placeholder:text-slate-400 focus:border-[#1565FF] focus:ring-4 focus:ring-blue-500/15"
          />
        </div>

        <footer className="flex shrink-0 gap-3 border-t border-sky-100/70 bg-white/75 px-5 py-4 backdrop-blur-md pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="min-h-[52px] flex-1 rounded-2xl border-2 border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-50 active:scale-[0.98] disabled:opacity-60"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#1565FF] to-[#33B6FF] px-4 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition hover:brightness-105 active:scale-[0.98] disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Icons.Loader2 className="h-4 w-4 animate-spin" />
                {t('helper_dashboard.apply_sending_modal')}
              </>
            ) : (
              t('helper_proposal.submit')
            )}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
