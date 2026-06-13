import * as Icons from 'lucide-react';
import { useMemo } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import type { CreditTransaction, OpportunityUnlock } from '@/types/credits';
import { formatLinkCredits } from '@/utils/formatLinkCredits';
import {
  computeCreditsUsageSummary,
  formatUnlockStatusKey,
  getLatestRefundTransaction,
  isUnlockRefundEligible,
} from '@/utils/opportunityUnlockRefund';
import { resolveCreditTransactionAmount } from '@/utils/creditTransactionDisplay';

type Props = {
  unlocks: OpportunityUnlock[];
  transactions: CreditTransaction[];
  className?: string;
};

const STATS_META = [
  { key: 'lc_used' as const, icon: Icons.TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { key: 'lc_returned' as const, icon: Icons.RefreshCw, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { key: 'response_rate' as const, icon: Icons.PieChart, color: 'text-violet-400', bg: 'bg-violet-500/10' },
  { key: 'unlocks' as const, icon: Icons.Users, color: 'text-amber-400', bg: 'bg-amber-500/10' },
];

export function CreditsUsageDashboard({ unlocks, transactions, className = '' }: Props) {
  const { t, language } = useLanguage();
  const summary = useMemo(
    () => computeCreditsUsageSummary(unlocks, transactions),
    [unlocks, transactions],
  );

  const values = [
    formatLinkCredits(summary.lcUsed, language),
    formatLinkCredits(summary.lcReturned, language),
    `${summary.responseRatePct}%`,
    String(summary.leadsUnlocked),
  ];

  return (
    <section
      className={`rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 backdrop-blur-sm ${className}`}
    >
      <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-blue-400">
        {t('credits_usage.title')}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STATS_META.map((meta, i) => {
          const Icon = meta.icon;
          return (
            <div
              key={meta.key}
              className="flex flex-col items-center gap-2 rounded-xl border border-white/[0.05] bg-white/[0.03] px-3 py-3 text-center"
            >
              <span className={`flex h-8 w-8 items-center justify-center rounded-full ${meta.bg}`}>
                <Icon className={`h-4 w-4 ${meta.color}`} />
              </span>
              <p className="text-[10px] font-bold uppercase leading-tight text-slate-500">
                {t(`credits_usage.${meta.key}`)}
              </p>
              <p className="text-lg font-black tabular-nums text-white">{values[i]}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function CreditRefundStatusCard({
  unlocks,
  transactions,
  className = '',
}: Props) {
  const { t, language } = useLanguage();
  const latestRefund = getLatestRefundTransaction(transactions);
  const pendingEligible = unlocks.find((unlock) =>
    isUnlockRefundEligible({
      status: unlock.status,
      refundStatus: unlock.refundStatus,
      responseDeadlineMs: unlock.responseDeadline,
    }),
  );

  if (!latestRefund && !pendingEligible) return null;

  const labelKey = latestRefund ? 'credits_refund.no_reply' : 'credits_refund.awaiting_deadline';
  const amount = latestRefund ? resolveCreditTransactionAmount(latestRefund) : pendingEligible?.creditsSpent ?? 0;

  return (
    <div
      className={`flex items-center gap-4 rounded-2xl border border-emerald-700/30 bg-emerald-950/30 px-5 py-4 ${className}`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
        <Icons.RefreshCw className="h-5 w-5 text-emerald-400" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-bold text-emerald-400">{t(labelKey)}</p>
        <p className="mt-0.5 text-sm font-black text-emerald-200">
          {latestRefund
            ? t('credits_refund.lc_returned', {
                amount: formatLinkCredits(resolveCreditTransactionAmount(latestRefund), language),
              })
            : t('credits_refund.eligible_amount', {
                amount: formatLinkCredits(amount, language),
              })}
        </p>
      </div>
      <Icons.ChevronRight className="ml-auto h-4 w-4 shrink-0 text-emerald-600" />
    </div>
  );
}

export function OpportunityUnlocksList({
  unlocks,
  className = '',
}: {
  unlocks: OpportunityUnlock[];
  className?: string;
}) {
  const { t, language } = useLanguage();

  if (!unlocks.length) return null;

  return (
    <section className={`rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 ${className}`}>
      <h2 className="mb-4 text-lg font-black text-white">{t('credits_unlock.list_title')}</h2>
      <div className="space-y-2">
        {unlocks.slice(0, 15).map((unlock) => (
          <div
            key={unlock.id}
            className="grid grid-cols-[1fr_auto] gap-3 rounded-xl border border-white/[0.05] bg-white/[0.03] px-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-200">
                {t('credits_unlock.opportunity_label', { id: unlock.opportunityId.slice(0, 8) })}
              </p>
              <p className="text-xs font-medium text-slate-500">
                {t(formatUnlockStatusKey(unlock.status))}
                {unlock.refundedAt
                  ? ` · ${new Date(unlock.refundedAt).toLocaleString()}`
                  : unlock.responseDeadline
                    ? ` · ${t('credits_unlock.deadline')}: ${new Date(unlock.responseDeadline).toLocaleString()}`
                    : ''}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-black text-amber-300">
                {formatLinkCredits(unlock.creditsSpent, language)}
              </p>
              {unlock.status === 'refunded' && unlock.refundedAt ? (
                <p className="text-[11px] font-bold text-emerald-400">
                  {t('credits_refund.lc_returned', {
                    amount: formatLinkCredits(unlock.creditsSpent, language),
                  })}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
