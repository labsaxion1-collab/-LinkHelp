import type React from 'react';
import * as Icons from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '@/utils/constants';

export type HelperNavSection =
  | 'home'
  | 'opportunities'
  | 'performance'
  | 'applications'
  | 'jobs'
  | 'availability'
  | 'credits';

type Props = {
  activeTab: 'match' | 'recentes' | 'emergencia' | 'candidaturas';
  onSelectFeedTab: (tab: 'match' | 'recentes' | 'emergencia' | 'candidaturas') => void;
  t: (key: string) => string;
  onSwitchClient: () => void;
};

export function resolveHelperNavSection(
  pathname: string,
  activeTab: Props['activeTab'],
): HelperNavSection {
  if (pathname === ROUTES.helperCredits) return 'credits';
  if (pathname === ROUTES.helperJobs) return 'jobs';
  if (pathname === ROUTES.helperPerformance) return 'performance';
  if (pathname === ROUTES.settings) return 'availability';
  if (activeTab === 'candidaturas') return 'applications';
  if (pathname === ROUTES.helperOpportunities) return 'opportunities';
  if (pathname === ROUTES.helperDashboard) return 'home';
  return 'home';
}

export function HelperDashboardNav({ activeTab, onSelectFeedTab, t, onSwitchClient }: Props) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const section = resolveHelperNavSection(pathname, activeTab);

  const tabClass = (active: boolean) =>
    `group relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
      active ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
    }`;

  const tooltipClass =
    'pointer-events-none absolute left-1/2 top-[calc(100%+8px)] z-20 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-950 px-2.5 py-1.5 text-xs font-bold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100';

  const items: {
    id: HelperNavSection;
    labelKey: string;
    icon: React.ComponentType<{ className?: string }>;
    onClick: () => void;
    hidden?: boolean;
  }[] = [
    {
      id: 'home',
      labelKey: 'helper_dashboard.nav_home',
      icon: Icons.Home,
      onClick: () => {
        navigate(ROUTES.helperDashboard);
        onSelectFeedTab('match');
      },
    },
    {
      id: 'opportunities',
      labelKey: 'helper_dashboard.nav_opportunities',
      icon: Icons.Target,
      onClick: () => {
        navigate(ROUTES.helperOpportunities);
        onSelectFeedTab('match');
      },
    },
    {
      id: 'performance',
      labelKey: 'helper_dashboard.nav_performance',
      icon: Icons.Activity,
      onClick: () => navigate(ROUTES.helperPerformance),
    },
    {
      id: 'applications',
      labelKey: 'helper_dashboard.nav_applications',
      icon: Icons.ClipboardList,
      onClick: () => {
        navigate(ROUTES.helperDashboard);
        onSelectFeedTab('candidaturas');
      },
    },
    {
      id: 'jobs',
      labelKey: 'helper_dashboard.nav_active_services',
      icon: Icons.Briefcase,
      onClick: () => navigate(ROUTES.helperJobs),
    },
    {
      id: 'availability',
      labelKey: 'helper_dashboard.nav_availability',
      icon: Icons.Clock,
      onClick: () => navigate(ROUTES.settings),
    },
    {
      id: 'credits',
      labelKey: 'helper_dashboard.nav_credits',
      icon: Icons.Coins,
      onClick: () => navigate(ROUTES.helperCredits),
      hidden: true,
    },
  ];

  return (
    <div className="mb-5 hidden md:block rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-sm">
      <div className="flex gap-2 overflow-visible">
        {items
          .filter((item) => !item.hidden)
          .map((item) => {
            const Icon = item.icon;
            const label = t(item.labelKey);
            return (
              <button
                key={item.id}
                type="button"
                title={label}
                aria-label={label}
                onClick={item.onClick}
                className={tabClass(section === item.id)}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className={tooltipClass}>{label}</span>
              </button>
            );
          })}
        <button
          type="button"
          title={t('sidebar.switch_client')}
          aria-label={t('sidebar.switch_client')}
          onClick={onSwitchClient}
          className="group relative ml-auto inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          <Icons.RefreshCw className="h-5 w-5 shrink-0" />
          <span className={tooltipClass}>{t('sidebar.switch_client')}</span>
        </button>
      </div>
    </div>
  );
}
