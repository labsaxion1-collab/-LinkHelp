import {
  LayoutDashboard,
  Sparkles,
  Layers,
  Settings,
  ChevronDown,
  Users,
  Briefcase,
  Coins,
  LineChart,
  Shield,
  Headphones,
} from 'lucide-react';
import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { BACKOFFICE_PT, FLUX_PT, fluxAppStatusLabelPt } from '@/admin/fluxPtCopy';
import { FLUX_ADMIN_APPS, DEFAULT_FLUX_APP_ID } from '@/config/fluxAdminApps';
import { FluxBrandMark } from '@/components/brand/FluxBrandMark';
import { ROUTES } from '@/utils/constants';

type Props = {
  activeSection: 'overview' | 'insights' | 'categories';
  onSectionChange: (section: 'overview' | 'insights' | 'categories') => void;
};

export function FluxAdminSidebar({ activeSection, onSectionChange }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeAppId, setActiveAppId] = useState(DEFAULT_FLUX_APP_ID);
  const [appPickerOpen, setAppPickerOpen] = useState(false);
  const activeApp = FLUX_ADMIN_APPS.find((a) => a.id === activeAppId) ?? FLUX_ADMIN_APPS[0];
  const onDashboard = location.pathname === ROUTES.adminDashboard;

  const navItems = [
    { id: 'overview' as const, label: FLUX_PT.navOverview, icon: LayoutDashboard },
    { id: 'insights' as const, label: FLUX_PT.navInsights, icon: Sparkles },
    { id: 'categories' as const, label: FLUX_PT.navCategories, icon: Layers },
  ];

  const opsItems = [
    { to: ROUTES.adminUsers, label: BACKOFFICE_PT.navUsers, icon: Users },
    { to: ROUTES.adminRequests, label: BACKOFFICE_PT.navRequests, icon: Briefcase },
    { to: ROUTES.adminCredits, label: BACKOFFICE_PT.navCredits, icon: Coins },
    { to: ROUTES.adminEconomy, label: BACKOFFICE_PT.navEconomy, icon: LineChart },
    { to: ROUTES.adminAudit, label: BACKOFFICE_PT.navAudit, icon: Shield },
    { to: ROUTES.adminSupport, label: BACKOFFICE_PT.navSupport, icon: Headphones },
  ];

  const goToDashboardSection = (section: 'overview' | 'insights' | 'categories') => {
    onSectionChange(section);
    if (!onDashboard) navigate(ROUTES.adminDashboard);
  };

  return (
    <aside className="flux-admin-sidebar flex h-full w-[260px] shrink-0 flex-col border-r border-cyan-500/10 bg-[#030308]/95 backdrop-blur-xl">
      <div className="border-b border-white/8 px-5 py-5">
        <FluxBrandMark forcePtTagline />
      </div>

      <div className="border-b border-white/8 px-4 py-4">
        <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          {FLUX_PT.appSwitcherLabel}
        </p>
        <div className="relative">
          <button
            type="button"
            onClick={() => setAppPickerOpen((o) => !o)}
            className="flex w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-left transition-colors hover:bg-white/[0.07]"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: activeApp.accent }}
                aria-hidden
              />
              <span className="truncate text-sm font-bold text-white">{activeApp.name}</span>
            </span>
            <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${appPickerOpen ? 'rotate-180' : ''}`} />
          </button>
          {appPickerOpen ? (
            <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-xl border border-white/10 bg-[#121826] shadow-2xl">
              {FLUX_ADMIN_APPS.map((app) => (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => {
                    setActiveAppId(app.id);
                    setAppPickerOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-white/5 ${
                    app.id === activeAppId ? 'bg-white/[0.06] text-white' : 'text-slate-300'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: app.accent }} />
                  <span className="font-semibold">{app.name}</span>
                  <span className="ml-auto text-[10px] uppercase tracking-wide text-slate-500">
                    {fluxAppStatusLabelPt(app.status)}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          {FLUX_PT.navAnalyticsLabel}
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = onDashboard && activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => goToDashboardSection(item.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-all ${
                active
                  ? 'bg-gradient-to-r from-cyan-500/20 via-violet-600/15 to-violet-700/10 text-white shadow-[inset_0_1px_0_rgba(0,242,255,0.12)]'
                  : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? 'text-cyan-300' : ''}`} />
              {item.label}
            </button>
          );
        })}

        <p className="mb-2 mt-5 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          {BACKOFFICE_PT.navOperationsLabel}
        </p>
        {opsItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/20 via-violet-600/15 to-violet-700/10 text-white shadow-[inset_0_1px_0_rgba(0,242,255,0.12)]'
                    : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-white/8 p-4">
        <button
          type="button"
          disabled
          className="flex w-full cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-600 opacity-60"
        >
          <Settings className="h-4 w-4" />
          {FLUX_PT.navSettings}
        </button>
        <p className="mt-3 px-1 text-[10px] leading-relaxed text-slate-600">{FLUX_PT.multiAppHint}</p>
      </div>
    </aside>
  );
}
