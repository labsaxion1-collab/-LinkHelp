import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Briefcase, Users, Zap, Activity, RefreshCw } from 'lucide-react';
import { useAdminDashboardSummary } from '@/admin/hooks/useAdminDashboardSummary';
import { isAdminDashboardEmpty } from '@/admin/adminDashboardContract';
import { adminDashboardErrorMessage } from '@/admin/adminDashboardErrors';
import type { AdminFinancialTimeRange } from '@/admin/adminDashboardFinancialContract';
import { FLUX_PT, serviceCategoryLabelPt } from '@/admin/fluxPtCopy';
import { formatCadAmount, formatAdminPercent } from '@/admin/fluxFormat';
import { FluxMetricCard } from '@/components/admin/FluxMetricCard';
import { FluxAiInsightsPanel } from '@/components/admin/FluxAiInsightsPanel';
import { FluxCategoryIntelligence, type CategoryIntelRow } from '@/components/admin/FluxCategoryIntelligence';
import { FluxFinancialOverview } from '@/components/admin/FluxFinancialOverview';
import { SERVICE_CATEGORIES } from '@/data/serviceCategories';
import { CLIENT_LINKCREDITS_ENABLED } from '@/config/clientLinkCredits';

export type FluxAdminOutletContext = {
  activeSection: 'overview' | 'insights' | 'categories';
  setActiveSection: (s: 'overview' | 'insights' | 'categories') => void;
};

export default function AdminDashboard() {
  const [timeRange, setTimeRange] = useState<AdminFinancialTimeRange>('all');
  const { summary, financial, financialError, loading, errorCode, reload } = useAdminDashboardSummary(timeRange);
  const { activeSection } = useOutletContext<FluxAdminOutletContext>();

  const metrics = {
    openJobs: summary?.openRequests ?? 0,
    inProgress: summary?.inProgressRequests ?? 0,
    pendingApps: summary?.pendingApplications ?? 0,
    hiredApps: summary?.hiredApplications ?? 0,
    hireRate: summary?.hireRate ?? 0,
  };

  const categoryRows = useMemo((): CategoryIntelRow[] => {
    const byCategory = new Map((summary?.categories ?? []).map((row) => [row.category, row]));
    return SERVICE_CATEGORIES.map((cat) => {
      const aggregate = byCategory.get(cat.id);
      const openRequests = aggregate?.openRequests ?? 0;
      const trend: CategoryIntelRow['trend'] =
        openRequests >= 3 ? 'up' : openRequests === 0 ? 'down' : 'flat';
      return {
        id: cat.id,
        label: serviceCategoryLabelPt(cat.id),
        icon: cat.icon,
        openRequests,
        applications: aggregate?.applications ?? 0,
        hireRate: aggregate?.hireRate ?? 0,
        avgBudget: aggregate?.averageBudget != null
          ? formatCadAmount(Math.round(aggregate.averageBudget))
          : FLUX_PT.budgetNa,
        trend,
      };
    }).sort((a, b) => b.openRequests - a.openRequests);
  }, [summary]);

  const aiInsights = useMemo(
    () => [
      {
        id: '1',
        type: 'opportunity' as const,
        title: FLUX_PT.insight1Title,
        body: FLUX_PT.insight1Body,
        score: 86,
      },
      {
        id: '2',
        type: 'trend' as const,
        title: FLUX_PT.insight2Title,
        body: FLUX_PT.insight2Body,
        score: 72,
      },
      {
        id: '3',
        type: 'risk' as const,
        title: FLUX_PT.insight3Title,
        body: FLUX_PT.insight3Body,
      },
    ],
    [],
  );

  const showOverview = activeSection === 'overview';
  const showInsights = activeSection === 'overview' || activeSection === 'insights';
  const showCategories = activeSection === 'overview' || activeSection === 'categories';
  const showEmptyState = !loading && !errorCode && summary != null && isAdminDashboardEmpty(summary);
  const errorMessage = errorCode ? adminDashboardErrorMessage(errorCode) : null;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {loading && !summary && !errorCode ? (
        <div className="flex min-h-40 items-center justify-center text-sm font-semibold text-slate-400">
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          {FLUX_PT.loadingMetrics}
        </div>
      ) : null}

      {errorCode ? (
        <div
          role="alert"
          className="flex flex-col gap-3 border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-100 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="font-bold">{errorMessage}</p>
            {import.meta.env.DEV ? (
              <p className="mt-1 font-mono text-xs text-rose-200/80">{errorCode}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={reload}
            className="inline-flex h-9 shrink-0 items-center gap-2 border border-rose-300/30 px-3 font-bold hover:bg-white/10"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {FLUX_PT.retry}
          </button>
        </div>
      ) : null}

      {showEmptyState ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-8 text-center">
          <p className="text-base font-black text-white">{FLUX_PT.emptyTitle}</p>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
            {FLUX_PT.emptyBody}
          </p>
        </div>
      ) : null}

      {showOverview && summary && !errorCode ? (
        <>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-400/90">
              {FLUX_PT.liveMetrics}
            </p>
            <h2 className="mt-1 text-2xl font-black text-white">{FLUX_PT.overviewTitle}</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <FluxMetricCard
              label={FLUX_PT.metricOpenRequests}
              value={metrics.openJobs}
              delta={FLUX_PT.metricOpenDelta}
              deltaPositive
              icon={Briefcase}
              accent="blue"
            />
            <FluxMetricCard
              label={FLUX_PT.metricInProgress}
              value={metrics.inProgress}
              icon={Activity}
              accent="violet"
            />
            <FluxMetricCard
              label={FLUX_PT.metricPendingApps}
              value={metrics.pendingApps}
              icon={Users}
              accent="amber"
            />
            <FluxMetricCard
              label={FLUX_PT.metricHireRate}
              value={formatAdminPercent(metrics.hireRate)}
              delta={FLUX_PT.metricHiredCount(metrics.hiredApps)}
              deltaPositive={metrics.hireRate > 0}
              icon={Zap}
              accent="emerald"
            />
          </div>

          <FluxFinancialOverview
            financial={financial}
            financialError={financialError}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
            loading={loading}
          />

          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-violet-600/15 to-transparent p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-violet-300/80">
              {FLUX_PT.marketPulseDemoLabel}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">{FLUX_PT.marketPulseBody}</p>
          </div>
        </>
      ) : null}

      {showInsights && summary && !errorCode ? <FluxAiInsightsPanel insights={aiInsights} demo /> : null}
      {showCategories && summary && !errorCode ? <FluxCategoryIntelligence rows={categoryRows} /> : null}

      {!CLIENT_LINKCREDITS_ENABLED ? (
        <p className="border-t border-white/5 pt-6 text-xs leading-relaxed text-slate-500">
          {FLUX_PT.clientLinkCreditsFlag}
        </p>
      ) : null}
    </div>
  );
}
