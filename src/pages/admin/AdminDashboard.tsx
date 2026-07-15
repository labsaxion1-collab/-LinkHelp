import { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Briefcase, Users, Zap, DollarSign, Activity, RefreshCw } from 'lucide-react';
import { useAdminDashboardSummary } from '@/admin/hooks/useAdminDashboardSummary';
import { useLanguage } from '@/context/LanguageContext';
import { FluxMetricCard } from '@/components/admin/FluxMetricCard';
import { FluxAiInsightsPanel } from '@/components/admin/FluxAiInsightsPanel';
import { FluxCategoryIntelligence, type CategoryIntelRow } from '@/components/admin/FluxCategoryIntelligence';
import { SERVICE_CATEGORIES } from '@/data/serviceCategories';
import { CLIENT_LINKCREDITS_ENABLED } from '@/config/clientLinkCredits';

export type FluxAdminOutletContext = {
  activeSection: 'overview' | 'insights' | 'categories';
  setActiveSection: (s: 'overview' | 'insights' | 'categories') => void;
};

export default function AdminDashboard() {
  const { t } = useLanguage();
  const { data: summary, loading, error, reload } = useAdminDashboardSummary();
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
        label: t(`categories.${cat.id}`),
        icon: cat.icon,
        openRequests,
        applications: aggregate?.applications ?? 0,
        hireRate: aggregate?.hireRate ?? 0,
        avgBudget: aggregate?.averageBudget != null
          ? `CAD $${Math.round(aggregate.averageBudget)}`
          : t('flux_admin.budget_na'),
        trend,
      };
    }).sort((a, b) => b.openRequests - a.openRequests);
  }, [summary, t]);

  const aiInsights = useMemo(
    () => [
      {
        id: '1',
        type: 'opportunity' as const,
        title: t('flux_admin.insight_1_title'),
        body: t('flux_admin.insight_1_body'),
        score: 86,
      },
      {
        id: '2',
        type: 'trend' as const,
        title: t('flux_admin.insight_2_title'),
        body: t('flux_admin.insight_2_body'),
        score: 72,
      },
      {
        id: '3',
        type: 'risk' as const,
        title: t('flux_admin.insight_3_title'),
        body: t('flux_admin.insight_3_body'),
      },
    ],
    [t],
  );

  const showOverview = activeSection === 'overview';
  const showInsights = activeSection === 'overview' || activeSection === 'insights';
  const showCategories = activeSection === 'overview' || activeSection === 'categories';

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {loading && !summary ? (
        <div className="flex min-h-40 items-center justify-center text-sm font-semibold text-slate-400">
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          {t('common.loading')}
        </div>
      ) : null}
      {error ? (
        <div className="flex items-center justify-between gap-4 border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-100">
          <span>{t('common.error')}</span>
          <button type="button" onClick={reload} className="inline-flex h-9 items-center gap-2 border border-rose-300/30 px-3 font-bold hover:bg-white/10">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {t('common.retry')}
          </button>
        </div>
      ) : null}
      {showOverview && (
        <>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-400/90">
              {t('flux_admin.live_metrics')}
            </p>
            <h2 className="mt-1 text-2xl font-black text-white">{t('flux_admin.overview_title')}</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <FluxMetricCard
              label={t('flux_admin.metric_open_requests')}
              value={metrics.openJobs}
              delta={t('flux_admin.metric_open_delta')}
              deltaPositive
              icon={Briefcase}
              accent="blue"
            />
            <FluxMetricCard
              label={t('flux_admin.metric_in_progress')}
              value={metrics.inProgress}
              icon={Activity}
              accent="violet"
            />
            <FluxMetricCard
              label={t('flux_admin.metric_pending_apps')}
              value={metrics.pendingApps}
              icon={Users}
              accent="amber"
            />
            <FluxMetricCard
              label={t('flux_admin.metric_hire_rate')}
              value={`${metrics.hireRate}%`}
              delta={t('flux_admin.metric_hired_count', { count: String(metrics.hiredApps) })}
              deltaPositive={metrics.hireRate > 0}
              icon={Zap}
              accent="emerald"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-violet-600/15 to-transparent p-5 lg:col-span-2">
              <div className="flex items-center gap-2 text-violet-300">
                <DollarSign className="h-5 w-5" />
                <span className="text-sm font-black">{t('flux_admin.market_pulse')}</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">{t('flux_admin.market_pulse_body')}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {t('flux_admin.platform_health')}
              </p>
              <p className="mt-2 text-3xl font-black text-emerald-400">98.2%</p>
              <p className="mt-1 text-xs text-slate-500">{t('flux_admin.platform_health_sub')}</p>
            </div>
          </div>
        </>
      )}

      {showInsights ? <FluxAiInsightsPanel insights={aiInsights} /> : null}
      {showCategories ? <FluxCategoryIntelligence rows={categoryRows} /> : null}

      {!CLIENT_LINKCREDITS_ENABLED ? (
        <p className="text-xs text-slate-500 leading-relaxed border-t border-white/5 pt-6">
          {t('client_linkcredits.admin_flag')}
        </p>
      ) : null}
    </div>
  );
}
