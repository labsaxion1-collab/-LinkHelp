import { LayoutDashboard, Sparkles, Layers, Settings, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { FLUX_ADMIN_APPS, DEFAULT_FLUX_APP_ID } from '@/config/fluxAdminApps';

type Props = {
  activeSection: 'overview' | 'insights' | 'categories';
  onSectionChange: (section: 'overview' | 'insights' | 'categories') => void;
};

export function FluxAdminSidebar({ activeSection, onSectionChange }: Props) {
  const { t } = useLanguage();
  const [activeAppId, setActiveAppId] = useState(DEFAULT_FLUX_APP_ID);
  const [appPickerOpen, setAppPickerOpen] = useState(false);
  const activeApp = FLUX_ADMIN_APPS.find((a) => a.id === activeAppId) ?? FLUX_ADMIN_APPS[0];

  const navItems = [
    { id: 'overview' as const, label: t('flux_admin.nav_overview'), icon: LayoutDashboard },
    { id: 'insights' as const, label: t('flux_admin.nav_insights'), icon: Sparkles },
    { id: 'categories' as const, label: t('flux_admin.nav_categories'), icon: Layers },
  ];

  return (
    <aside className="flux-admin-sidebar flex h-full w-[260px] shrink-0 flex-col border-r border-white/8 bg-[#0B0F19]">
      <div className="border-b border-white/8 px-5 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 text-xs font-black text-white shadow-lg shadow-violet-900/40">
            FL
          </div>
          <div>
            <p className="text-sm font-black tracking-wide text-white">FLUX</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300/80">
              {t('flux_admin.console_label')}
            </p>
          </div>
        </div>
      </div>

      <div className="border-b border-white/8 px-4 py-4">
        <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          {t('flux_admin.app_switcher_label')}
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
                  <span className="ml-auto text-[10px] uppercase tracking-wide text-slate-500">{app.status}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSectionChange(item.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-all ${
                active
                  ? 'bg-gradient-to-r from-violet-600/30 to-blue-600/20 text-white shadow-inner shadow-violet-900/20'
                  : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? 'text-violet-300' : ''}`} />
              {item.label}
            </button>
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
          {t('flux_admin.nav_settings')}
        </button>
        <p className="mt-3 px-1 text-[10px] leading-relaxed text-slate-600">{t('flux_admin.multi_app_hint')}</p>
      </div>
    </aside>
  );
}
