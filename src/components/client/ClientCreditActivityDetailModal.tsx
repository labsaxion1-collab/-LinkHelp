import { useEffect, useState, type ReactNode } from 'react';
import { PremiumResponsiveModal } from '@/components/design-system/PremiumResponsiveModal';
import { LhButton } from '@/components/design-system/LhButton';
import { fetchClientLedgerRequestDetail } from '@/services/supabase/clientCreditLedgerRemote';
import type { ClientCreditLedgerEntry, ClientLedgerRequestDetail } from '@/types/clientCredits';
import { formatJobBudgetDisplay } from '@/utils/formatJobBudget';
import { formatJobScheduleDisplay } from '@/utils/jobDisplay';
import {
  clientCreditAmountClass,
  formatSignedClientCreditAmount,
  resolveClientCreditEntryLabel,
} from '@/utils/clientCreditMetrics';
import { requestStatusLabelKey } from '@/utils/creditTransactionDisplay';

type Props = {
  entry: ClientCreditLedgerEntry | null;
  open: boolean;
  onClose: () => void;
  onRequestNotFound: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0">
      <span className="text-xs font-bold text-slate-500">{label}</span>
      <span className="max-w-[62%] text-right text-sm font-bold text-slate-900">{value}</span>
    </div>
  );
}

function categoryLabel(
  request: ClientLedgerRequestDetail,
  t: (key: string) => string,
): string {
  const category = t(`categories.${request.category}`);
  if (!request.subcategory) return category;
  const subKey = `service_subs.${request.category}.${request.subcategory}`;
  const sub = t(subKey);
  return sub !== subKey ? `${category} · ${sub}` : category;
}

export function ClientCreditActivityDetailModal({
  entry,
  open,
  onClose,
  onRequestNotFound,
  t,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [request, setRequest] = useState<ClientLedgerRequestDetail | null>(null);

  useEffect(() => {
    if (!open || !entry?.requestId) {
      setRequest(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void fetchClientLedgerRequestDetail(entry.requestId)
      .then((result) => {
        if (cancelled) return;
        if (!result) {
          onRequestNotFound();
          onClose();
          return;
        }
        setRequest(result);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, entry?.requestId, entry?.id]);

  if (!open || !entry) return null;

  const typeLabel = resolveClientCreditEntryLabel(entry, t);
  const amountText = `${formatSignedClientCreditAmount(entry.amount)} ${t('credits.lc_unit')}`;
  const statusKey = request ? requestStatusLabelKey(request.status) : null;
  const statusLabel = statusKey ? t(statusKey) : '—';
  const budgetLabel = request
    ? formatJobBudgetDisplay(
        {
          value: request.budget ?? '',
          budgetType: request.budgetType ?? 'negotiable',
          budgetMin: request.budgetMin,
          budgetMax: request.budgetMax,
          budgetAmount: request.budgetAmount,
          currency: request.currency ?? 'CAD',
        },
        t,
      )
    : '—';
  const scheduleLabel = request
    ? formatJobScheduleDisplay(
        {
          date: request.preferredDate ?? '',
          preferredDate: request.preferredDate,
          preferredTime: request.preferredTime,
          preferredPeriod: request.preferredPeriod,
          preferredTimeWindow: request.preferredTimeWindow,
          category: request.category,
        },
        t,
      )
    : '—';

  return (
    <PremiumResponsiveModal
      open={open}
      onClose={onClose}
      title={t('client_credits.activity_details')}
      footer={
        <LhButton type="button" variant="secondary" className="w-full" onClick={onClose}>
          {t('common.close')}
        </LhButton>
      }
    >
      <div className="space-y-5">
        <section>
          <h3 className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">
            {t('client_credits.transaction_details')}
          </h3>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4">
            <DetailRow label={t('client_credits.movement_type')} value={typeLabel} />
            <DetailRow
              label={t('client_credits.amount')}
              value={
                <span className={clientCreditAmountClass(entry.amount)}>{amountText}</span>
              }
            />
            <DetailRow
              label={t('credits_tx.field_balance_after')}
              value={`${entry.balanceAfter} ${t('credits.lc_unit')}`}
            />
            <DetailRow
              label={t('client_credits.transaction_date')}
              value={new Date(entry.createdAt).toLocaleString()}
            />
          </div>
        </section>

        {loading ? (
          <p className="py-6 text-center text-sm font-semibold text-slate-500">…</p>
        ) : request ? (
          <section>
            <h3 className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">
              {t('client_credits.request_details')}
            </h3>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4">
              <DetailRow label={t('create_modal.service_category')} value={categoryLabel(request, t)} />
              <DetailRow label={t('client_credits.request_title')} value={request.title} />
              {request.description.trim() ? (
                <div className="border-b border-slate-100 py-3 last:border-b-0">
                  <p className="text-xs font-bold text-slate-500">{t('create_modal.description')}</p>
                  <p className="mt-1 whitespace-pre-wrap text-left text-sm font-medium text-slate-800">
                    {request.description}
                  </p>
                </div>
              ) : null}
              <DetailRow label={t('create_modal.location')} value={request.location || '—'} />
              <DetailRow label={t('create_modal.preferred_date')} value={scheduleLabel} />
              <DetailRow label={t('create_modal.budget_hint_label')} value={budgetLabel} />
              <DetailRow label={t('client_credits.request_status')} value={statusLabel} />
            </div>
          </section>
        ) : null}
      </div>
    </PremiumResponsiveModal>
  );
}
