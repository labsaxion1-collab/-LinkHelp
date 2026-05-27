import { memo } from 'react';
import * as Icons from 'lucide-react';
import { LhCard } from '@/components/design-system/LhCard';
import { translateCategory } from '@/utils/translateCategory';
import type { NearbyHelperMapPoint } from '@/types/nearbyHelper';

type Props = {
  helpers: NearbyHelperMapPoint[];
  loading: boolean;
  t: (key: string, options?: Record<string, string | number>) => string;
  onViewProfile: (helper: NearbyHelperMapPoint) => void;
};

function primaryCategoryLabel(helper: NearbyHelperMapPoint, t: Props['t']): string {
  const id = helper.skillIds[0];
  if (!id) return t('client_dashboard.helper_category_unknown');
  return translateCategory(id, t);
}

function ClientNearbyHelpersListInner({ helpers, loading, t, onViewProfile }: Props) {
  const top = helpers.slice(0, 6);

  return (
    <LhCard className="mb-6 w-full max-w-full min-w-0" padding="md">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-black text-slate-950">{t('client_dashboard.nearby_helpers_title')}</h3>
        <span className="text-[10px] font-bold text-slate-500">
          {loading ? t('common.loading') : t('client_dashboard.nearby_helpers_count', { count: top.length })}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm font-semibold text-slate-500">
          <Icons.Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          {t('common.loading')}
        </div>
      ) : top.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-center text-xs font-semibold text-slate-500">
          {t('client_dashboard.map_no_helpers_nearby')}
        </p>
      ) : (
        <ul className="space-y-2">
          {top.map((helper) => (
            <li
              key={helper.id}
              className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-2.5"
            >
              <img
                src={helper.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${helper.id}`}
                alt=""
                className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-white"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-slate-950">{helper.name}</p>
                <p className="truncate text-[11px] font-semibold text-slate-500">{primaryCategoryLabel(helper, t)}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] font-bold text-slate-600">
                  {helper.distanceKm != null ? (
                    <span className="inline-flex items-center gap-0.5 text-blue-700">
                      <Icons.MapPin className="h-3 w-3" />
                      {t('client_dashboard.distance_km', { km: helper.distanceKm.toFixed(1) })}
                    </span>
                  ) : null}
                  {helper.rating != null ? (
                    <span className="inline-flex items-center gap-0.5 text-amber-700">
                      <Icons.Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {helper.rating.toFixed(1)}
                    </span>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onViewProfile(helper)}
                className="shrink-0 rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 text-[10px] font-black text-blue-700 hover:bg-blue-50"
              >
                {t('client_dashboard.view_helper_profile')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </LhCard>
  );
}

export const ClientNearbyHelpersList = memo(ClientNearbyHelpersListInner);
