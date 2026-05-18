import * as Icons from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LhCard } from '@/components/design-system/LhCard';
import { ClientRadarInsights } from '@/components/client/ClientRadarInsights';
import { ROUTES } from '@/utils/constants';
import type { Application } from '@/types/application';
import type { Job } from '@/types/job';
import type { Notification } from '@/types/notification';
import { useNearbyHelpers } from '@/hooks/useNearbyHelpers';

type Props = {
  t: (key: string, vars?: Record<string, string | number>) => string;
  clientId: string;
  jobs: Job[];
  applications: Application[];
  notifications: Notification[];
};

export function ClientMapWidget({ t, clientId, jobs, applications, notifications }: Props) {
  const navigate = useNavigate();
  const relatedCategories = [...new Set(jobs.filter((j) => j.status === 'open').map((j) => j.category).filter(Boolean))];
  const { helpers, loading } = useNearbyHelpers({ relatedCategoryIds: relatedCategories });
  const helperCount = helpers.length;
  const goToMap = () => navigate(ROUTES.map);

  const mapLabel =
    loading
      ? t('common.loading')
      : helperCount != null && helperCount > 0
        ? t('client_dashboard.map_helpers_count', { count: helperCount })
        : t('client_dashboard.map_no_helpers_nearby');

  return (
    <LhCard padding="none" className="overflow-hidden transition-shadow duration-300 hover:shadow-[var(--lh-shadow-md)] motion-reduce:transform-none">
      <button
        type="button"
        onClick={goToMap}
        className="w-full p-4 border-b border-gray-50 flex items-center justify-between text-left hover:bg-blue-50/40 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-200 cursor-pointer"
        aria-label={t('client_dashboard.view_map_expanded')}
      >
        <span className="flex items-center gap-2">
          <Icons.MapPin className="w-4 h-4 text-blue-600" />
          <span className="font-bold text-gray-900 text-sm">{t('client_dashboard.map_widget_title')}</span>
        </span>
        <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md group-hover:bg-blue-100 group-hover:text-blue-800">
          {t('client_dashboard.map_widget_neutral')}
        </span>
      </button>

      <button
        type="button"
        onClick={goToMap}
        className="relative h-40 w-full bg-blue-50/50 flex items-center justify-center overflow-hidden cursor-pointer hover:bg-blue-100/60 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-300"
        aria-label={t('client_dashboard.view_map_expanded')}
      >
        <span
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at center, #3b82f6 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
        <span className="absolute inset-0 pointer-events-none bg-gradient-to-t from-blue-50/50 to-transparent" />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full z-0">
          <span className="absolute inset-0 rounded-full border-2 border-blue-400/80 animate-ping opacity-60 [animation-duration:2.8s] motion-reduce:animate-none" />
          <span className="absolute -inset-4 rounded-full border border-blue-300/60 animate-ping opacity-40 [animation-duration:3.4s] motion-reduce:animate-none" />
        </span>
        <span className="relative z-10 text-xs font-medium text-slate-600 px-4 text-center">{mapLabel}</span>
        <span className="absolute bottom-2 right-2 z-10 rounded-full bg-white/90 border border-blue-100 p-1.5 shadow-sm">
          <Icons.Maximize2 className="w-3.5 h-3.5 text-blue-600" />
        </span>
      </button>

      <button
        type="button"
        onClick={goToMap}
        className="w-full p-2 border-t border-gray-50 bg-gray-50 text-center hover:bg-gray-100 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-200"
      >
        <span className="text-xs font-semibold text-blue-600">{t('client_dashboard.view_map_expanded')}</span>
      </button>

      <ClientRadarInsights t={t} clientId={clientId} jobs={jobs} applications={applications} notifications={notifications} />
    </LhCard>
  );
}
