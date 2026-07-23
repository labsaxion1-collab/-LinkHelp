import { ChevronRight } from 'lucide-react';
import * as Icons from 'lucide-react';
import { clsx } from 'clsx';
import { useLanguage } from '@/context/LanguageContext';
import { CLIENT_LINKCREDITS_ENABLED } from '@/config/clientLinkCredits';

export type AppHomeClientQuickStripProps = {
  activeJobsCount: number;
  pendingApplicationsCount: number;
  upcomingServicesCount: number;
  creditsBalance: number | null;
  creditsLoading: boolean;
  onOpenActiveServices: () => void;
  onOpenMessages: () => void;
  onCreateRequest: () => void;
  className?: string;
};

import { useDevRenderCount } from '@/utils/devRenderCount';

export function AppHomeClientQuickStrip({
  activeJobsCount,
  pendingApplicationsCount,
  upcomingServicesCount,
  creditsBalance,
  creditsLoading,
  onOpenActiveServices,
  onOpenMessages,
  onCreateRequest,
  className = '',
}: AppHomeClientQuickStripProps) {
  useDevRenderCount('AppHomeClientQuickStrip');
  const { t } = useLanguage();

  const tiles = [
    {
      key: 'active',
      icon: Icons.ClipboardList,
      label: t('app_home.client_tile_active_jobs'),
      value: String(activeJobsCount),
      onClick: onOpenActiveServices,
    },
    {
      key: 'applications',
      icon: Icons.Users,
      label: t('app_home.client_tile_applications'),
      value: String(pendingApplicationsCount),
      onClick: onOpenActiveServices,
    },
    {
      key: 'upcoming',
      icon: Icons.CalendarClock,
      label: t('app_home.client_tile_upcoming'),
      value: String(upcomingServicesCount),
      onClick: onOpenActiveServices,
    },
    {
      key: 'messages',
      icon: Icons.MessageCircle,
      label: t('messages_page.title'),
      value: '→',
      onClick: onOpenMessages,
    },
  ] as const;

  return (
    <section className={clsx('px-4 sm:px-6 md:px-8', className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-black tracking-tight text-[#0B1220]">{t('app_home.client_section_title')}</h2>
        <button
          type="button"
          onClick={onCreateRequest}
          className="inline-flex items-center gap-1 text-sm font-black text-[#2563FF]"
        >
          {t('client_dashboard.hero_cta')}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <button
              key={tile.key}
              type="button"
              onClick={tile.onClick}
              className="flex flex-col items-start rounded-2xl border border-slate-100 bg-white px-4 py-4 text-left shadow-[0_10px_28px_rgba(15,23,42,0.06)] transition hover:border-blue-100 hover:shadow-md active:scale-[0.99]"
            >
              <Icon className="h-5 w-5 text-[#2563FF]" strokeWidth={2.2} />
              <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">{tile.label}</p>
              <p className="mt-1 text-2xl font-black tabular-nums text-[#0B1220]">{tile.value}</p>
            </button>
          );
        })}
      </div>

      {CLIENT_LINKCREDITS_ENABLED ? (
        <div className="mt-3 flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-4 py-3">
          <span className="text-xs font-bold text-slate-600">{t('app_home.client_credits_label')}</span>
          <span className="text-sm font-black tabular-nums text-[#0B1220]">
            {creditsLoading ? '…' : creditsBalance ?? '—'}
          </span>
        </div>
      ) : null}
    </section>
  );
}
