import { formatCadFromCents, type AdminDashboardFinancialSummary } from '@/admin/adminDashboardFinancialContract';
import { useLanguage } from '@/context/LanguageContext';
import { clsx } from 'clsx';
import { Coins, Flame, Gift, RefreshCcw, RotateCcw, ShoppingCart, Wallet } from 'lucide-react';

type Props = {
  financial: AdminDashboardFinancialSummary | null;
  financialError: string | null;
  timeRange: 'today' | '7d' | '30d' | 'all';
  onTimeRangeChange: (range: 'today' | '7d' | '30d' | 'all') => void;
  loading?: boolean;
};

const ranges = ['today', '7d', '30d', 'all'] as const;

function MetricTile({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof Coins;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-2 flex items-center gap-2 text-slate-400">
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
        <span className="text-[11px] font-bold uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-black text-white">{value}</p>
      {hint ? <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function FluxFinancialOverview({
  financial,
  financialError,
  timeRange,
  onTimeRangeChange,
  loading = false,
}: Props) {
  const { t } = useLanguage();
  const avgPurchaseCad =
    financial && financial.purchaseCount > 0
      ? formatCadFromCents(Math.round(financial.revenueCadCents / financial.purchaseCount))
      : null;

  return (
    <section className="rounded-2xl border border-white/10 bg-[#0E1422]/90 p-5 shadow-xl shadow-black/30">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400/90">
            {t('flux_admin.financial_live_metrics')}
          </p>
          <h2 className="mt-1 text-xl font-black text-white">{t('flux_admin.financial_title')}</h2>
          <p className="mt-1 text-xs text-slate-500">{t('flux_admin.financial_sub')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {ranges.map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => onTimeRangeChange(range)}
              className={clsx(
                'rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors',
                timeRange === range
                  ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
                  : 'border-white/10 text-slate-400 hover:bg-white/5 hover:text-white',
              )}
            >
              {t(`flux_admin.financial_range_${range}`)}
            </button>
          ))}
        </div>
      </div>

      {financialError && !financial ? (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-100">
          {t('flux_admin.financial_unavailable')}
        </div>
      ) : null}

      {loading && !financial ? (
        <p className="text-sm text-slate-400">{t('common.loading')}</p>
      ) : null}

      {financial ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricTile
              icon={ShoppingCart}
              label={t('flux_admin.financial_revenue_cad')}
              value={`CAD $${formatCadFromCents(financial.revenueCadCents)}`}
              hint={
                financial.purchaseCount > 0
                  ? t('flux_admin.financial_purchase_stats', {
                      count: String(financial.purchaseCount),
                      avg: avgPurchaseCad ?? '0.00',
                    })
                  : t('flux_admin.financial_no_purchases')
              }
            />
            <MetricTile
              icon={Coins}
              label={t('flux_admin.financial_lc_sold')}
              value={`${financial.lcSold} LC`}
            />
            <MetricTile
              icon={Flame}
              label={t('flux_admin.financial_lc_consumed')}
              value={`${financial.lcConsumed} LC`}
            />
            <MetricTile
              icon={RotateCcw}
              label={t('flux_admin.financial_lc_refunded')}
              value={`${financial.lcRefunded} LC`}
            />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MetricTile
              icon={Gift}
              label={t('flux_admin.financial_lc_granted')}
              value={`${financial.lcGranted} LC`}
              hint={t('flux_admin.financial_lc_granted_hint')}
            />
            <MetricTile
              icon={Wallet}
              label={t('flux_admin.financial_lc_circulation')}
              value={`${financial.lcInCirculation} LC`}
            />
            <MetricTile
              icon={RefreshCcw}
              label={t('flux_admin.financial_net_burn')}
              value={`${financial.netCreditBurn} LC`}
              hint={t('flux_admin.financial_net_burn_hint')}
            />
          </div>
        </>
      ) : null}
    </section>
  );
}
