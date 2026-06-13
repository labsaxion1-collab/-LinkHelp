import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, X } from 'lucide-react';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';
import type { CreditTransaction, OpportunityUnlock } from '@/types/credits';
import type { Job } from '@/types/job';
import { useLanguage } from '@/context/LanguageContext';
import { useAppData } from '@/context/AppDataContext';
import { fetchCreditTransactionDetail } from '@/services/supabase/creditTransactionDetailRemote';
import { HelperOpportunityDetailModal } from '@/components/opportunities/HelperOpportunityDetailModal';
import { translateCategory } from '@/utils/translateCategory';
import { formatJobScheduleDisplay } from '@/utils/jobDisplay';
import { ROUTES } from '@/utils/constants';
import { formatLinkCredits } from '@/utils/formatLinkCredits';
import {
  applicationStatusLabelKey,
  creditTransactionExplanationKey,
  creditTransactionTypeLabelKey,
  findUnlockForTransaction,
  formatSignedCreditAmount,
  requestStatusLabelKey,
  resolveCreditTransactionAmount,
  shortTransactionId,
} from '@/utils/creditTransactionDisplay';

type Props = {
  tx: CreditTransaction | null;
  unlocks: OpportunityUnlock[];
  open: boolean;
  onClose: () => void;
};

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] py-3 last:border-b-0">
      <span className="text-xs font-bold text-slate-500">{label}</span>
      <span className="max-w-[62%] text-right text-sm font-bold text-slate-200">{value}</span>
    </div>
  );
}

export function CreditTransactionDetailModal({ tx, unlocks, open, onClose }: Props) {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { jobs } = useAppData();
  const [loading, setLoading] = useState(false);
  const [detailJob, setDetailJob] = useState<Job | null>(null);
  const [context, setContext] = useState<Awaited<ReturnType<typeof fetchCreditTransactionDetail>> | null>(null);

  useEffect(() => {
    if (!open || !tx) {
      setContext(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetchCreditTransactionDetail(tx)
      .then((result) => {
        if (!cancelled) setContext(result);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, tx]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !tx) return null;

  const unlock = findUnlockForTransaction(tx, unlocks);
  const amount = resolveCreditTransactionAmount(tx, unlock);
  const isExclusive = context?.application?.isExclusive === true;
  const requestId = tx.requestId ?? tx.relatedOpportunityId ?? context?.request?.id ?? null;

  const openRequest = () => {
    if (!requestId) return;
    const job = jobs.find((j) => j.id === requestId);
    if (job) {
      setDetailJob(job);
      return;
    }
    onClose();
    navigate(ROUTES.helperDashboard, { state: { openJobId: requestId } });
  };

  const amountColor = amount > 0 ? 'text-emerald-400' : amount < 0 ? 'text-rose-400' : 'text-slate-400';
  const requestStatusKey = requestStatusLabelKey(context?.request?.status);
  const applicationStatusKey = applicationStatusLabelKey(context?.application?.status);

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-4"
        onClick={onClose}
        role="presentation"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="credit-tx-detail-title"
          className={clsx(
            'relative flex w-full max-w-lg flex-col overflow-hidden border border-white/[0.08] bg-[#0A1628] shadow-2xl',
            'rounded-t-[1.75rem] sm:rounded-[1.75rem]',
            'max-h-[min(92dvh,680px)] pb-[max(env(safe-area-inset-bottom),0.75rem)] sm:pb-0',
            'animate-in slide-in-from-bottom-6 fade-in duration-300 sm:zoom-in-95',
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-center pt-3 sm:hidden">
            <span className="h-1 w-10 rounded-full bg-white/15" aria-hidden />
          </div>

          <header className="flex items-start gap-3 border-b border-white/[0.06] px-5 pb-4 pt-2 sm:pt-5">
            <div className="min-w-0 flex-1">
              <h2 id="credit-tx-detail-title" className="text-lg font-black text-white">
                {t('credits_tx.detail_title')}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 bg-white/[0.05] p-2 text-slate-400 hover:bg-white/[0.08] hover:text-white"
              aria-label={t('common.close')}
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            <p className="text-sm font-medium leading-relaxed text-slate-400">
              {t(creditTransactionExplanationKey(tx, { isExclusive }))}
            </p>

            <div className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4">
              <DetailRow label={t('credits_tx.field_type')} value={t(creditTransactionTypeLabelKey(tx.type))} />
              <DetailRow
                label={t('credits_tx.field_amount')}
                value={<span className={amountColor}>{formatSignedCreditAmount(amount)} LC</span>}
              />
              <DetailRow
                label={t('credits_tx.field_datetime')}
                value={new Date(tx.createdAt).toLocaleString()}
              />
              {tx.balanceBefore != null ? (
                <DetailRow
                  label={t('credits_tx.field_balance_before')}
                  value={formatLinkCredits(tx.balanceBefore, language)}
                />
              ) : null}
              <DetailRow
                label={t('credits_tx.field_balance_after')}
                value={formatLinkCredits(tx.balanceAfter, language)}
              />
              {context?.request ? (
                <>
                  <DetailRow label={t('credits_tx.field_request')} value={context.request.title} />
                  <DetailRow
                    label={t('credits_tx.field_category')}
                    value={translateCategory(context.request.category, t)}
                  />
                  {requestStatusKey ? (
                    <DetailRow label={t('credits_tx.field_request_status')} value={t(requestStatusKey)} />
                  ) : null}
                  <DetailRow label={t('credits_tx.field_client')} value={context.request.clientName} />
                </>
              ) : null}
              {applicationStatusKey ? (
                <DetailRow label={t('credits_tx.field_application_status')} value={t(applicationStatusKey)} />
              ) : null}
              <DetailRow label={t('credits_tx.field_transaction_id')} value={shortTransactionId(tx.id)} />
            </div>

            {loading ? (
              <p className="mt-3 text-xs font-medium text-slate-500">{t('common.loading')}</p>
            ) : null}

            {requestId ? (
              context?.request ? (
                <button
                  type="button"
                  onClick={openRequest}
                  className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-black text-white hover:bg-blue-500"
                >
                  {t('credits_tx.view_request')}
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : !loading ? (
                <p className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-200">
                  {t('credits_tx.request_unavailable')}
                </p>
              ) : null
            ) : null}
          </div>
        </div>
      </div>

      <HelperOpportunityDetailModal
        job={detailJob}
        open={Boolean(detailJob)}
        onClose={() => setDetailJob(null)}
        t={t}
        translateCategory={translateCategory}
        formatJobSchedule={formatJobScheduleDisplay}
      />
    </>,
    document.body,
  );
}
