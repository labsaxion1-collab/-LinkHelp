import * as Icons from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '@/utils/constants';
import { UI_VISIBILITY } from '@/config/uiVisibility';

export type HelperNavSection =
  | 'home'
  | 'opportunities'
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
    `inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-bold transition-colors ${
      active ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
    }`;

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
      hidden: !UI_VISIBILITY.helperCredits,
    },
  ];

  return (
    <div className="mb-5 hidden md:block rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-sm">
      <div className="flex gap-2 overflow-x-auto hide-scrollbar">
        {items
          .filter((item) => !item.hidden)
          .map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                className={tabClass(section === item.id)}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {t(item.labelKey)}
              </button>
            );
          })}
        <button
          type="button"
          onClick={onSwitchClient}
          className="ml-auto inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600 hover:bg-slate-100"
        >
          <Icons.RefreshCw className="h-4 w-4 shrink-0" />
          {t('sidebar.switch_client')}
        </button>
      </div>
    </div>
  );
}
