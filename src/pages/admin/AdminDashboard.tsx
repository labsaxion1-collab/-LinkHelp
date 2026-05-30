import { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Briefcase, Users, Zap, DollarSign, Activity } from 'lucide-react';
import { useAppData } from '@/context/AppDataContext';
import { useLanguage } from '@/context/LanguageContext';
import { FluxMetricCard } from '@/components/admin/FluxMetricCard';
import { FluxAiInsightsPanel } from '@/components/admin/FluxAiInsightsPanel';
import { FluxCategoryIntelligence, type CategoryIntelRow } from '@/components/admin/FluxCategoryIntelligence';
import { SERVICE_CATEGORIES } from '@/data/serviceCategories';

export type FluxAdminOutletContext = {
  activeSection: 'overview' | 'insights' | 'categories';
  setActiveSection: (s: 'overview' | 'insights' | 'categories') => void;
};

export default function AdminDashboard() {
  const { t } = useLanguage();
  const { jobs, applications } = useAppData();
  const { activeSection } = useOutletContext<FluxAdminOutletContext>();

  const metrics = useMemo(() => {
    const openJobs = jobs.filter((j) => j.status === 'open').length;
    const inProgress = jobs.filter((j) => j.status === 'in_progress').length;
    const pendingApps = applications.filter((a) => a.status === 'pending' || a.status === 'viewed').length;
    const hiredApps = applications.filter((a) => a.status === 'accepted').length;
    const hireRate = applications.length
      ? Math.round((hiredApps / Math.max(applications.length, 1)) * 100)
      : 0;
    return { openJobs, inProgress, pendingApps, hiredApps, hireRate };
  }, [jobs, applications]);

  const categoryRows = useMemo((): CategoryIntelRow[] => {
    return SERVICE_CATEGORIES.map((cat) => {
      const catJobs = jobs.filter((j) => j.category === cat.id);
      const openRequests = catJobs.filter((j) => j.status === 'open').length;
      const catApps = applications.filter((a) => catJobs.some((j) => j.id === a.jobId));
      const hired = catApps.filter((a) => a.status === 'accepted').length;
      const hireRate = catApps.length ? Math.round((hired / catApps.length) * 100) : 0;
      const budgets = catJobs
        .map((j) => j.budgetMax ?? j.budgetAmount ?? j.budgetMin)
        .filter((v): v is number => v != null && v > 0);
      const avgBudget =
        budgets.length > 0
          ? `CAD $${Math.round(budgets.reduce((s, v) => s + v, 0) / budgets.length)}`
          : t('flux_admin.budget_na');
      const trend: CategoryIntelRow['trend'] =
        openRequests >= 3 ? 'up' : openRequests === 0 ? 'down' : 'flat';
      return {
        id: cat.id,
        label: t(`categories.${cat.id}`),
        icon: cat.icon,
        openRequests,
        applications: catApps.length,
        hireRate,
        avgBudget,
        trend,
      };
    }).sort((a, b) => b.openRequests - a.openRequests);
  }, [jobs, applications, t]);

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
    </div>
  );
}
