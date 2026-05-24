import { clsx } from 'clsx';
import * as Icons from 'lucide-react';
import { UserPresenceBadge } from '@/components/ui/UserPresenceBadge';
import { parseSkillKey } from '@/data/helperSkillsCatalog';
import type { NearbyHelperMapPoint } from '@/types/nearbyHelper';
import { avatarUrlForName } from '@/utils/avatarUrl';

type Props = {
  key?: string;
  helper: NearbyHelperMapPoint;
  t: (key: string, vars?: Record<string, string | number>) => string;
  skillLabel: (skillId: string) => string;
  onViewOnMap?: () => void;
  highlighted?: boolean;
};

export function NearbyHelperListItem({ helper, t, skillLabel, onViewOnMap, highlighted = false }: Props) {
  return (
    <article
      className={clsx(
        'bg-white p-4 rounded-2xl shadow-sm border transition-all',
        highlighted ? 'border-blue-400 ring-2 ring-blue-200/80 shadow-md' : 'border-gray-100 hover:border-blue-200',
      )}
    >
      <div className="flex gap-3">
        {helper.avatarUrl ? (
          <img src={helper.avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover border border-gray-100 shrink-0" />
        ) : (
          <img src={avatarUrlForName(helper.name)} alt="" className="w-12 h-12 rounded-full object-cover border border-gray-100 shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-bold text-gray-900 text-sm truncate">{helper.name}</h4>
            {helper.onlineStatus ? <UserPresenceBadge role="helper" status={helper.onlineStatus} /> : null}
          </div>
          {helper.regionLabel ? (
            <p className="text-xs text-gray-500 font-medium flex items-center gap-1 mt-0.5">
              <Icons.MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{helper.regionLabel}</span>
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {helper.distanceKm != null ? (
              <span className="text-xs font-semibold text-blue-700">{t('live_map.distance_km', { km: helper.distanceKm })}</span>
            ) : null}
            {helper.rating != null && helper.rating > 0 ? (
              <span className="text-xs font-semibold text-amber-700 flex items-center gap-0.5">
                <Icons.Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                {helper.rating.toFixed(1)}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {helper.skillIds.length > 0 ? (
        <div className="flex flex-wrap gap-1 mt-3">
          {helper.skillIds.slice(0, 3).map((skillId) => {
            const parsed = parseSkillKey(skillId);
            if (!parsed) return null;
            return (
              <span key={skillId} className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[10px] font-semibold border border-gray-200">
                {skillLabel(skillId)}
              </span>
            );
          })}
        </div>
      ) : null}

      {onViewOnMap ? (
        <button
          type="button"
          onClick={onViewOnMap}
          className="mt-3 w-full py-2 bg-blue-50 text-blue-700 font-bold text-xs rounded-xl hover:bg-blue-100 transition-colors inline-flex items-center justify-center gap-1.5"
        >
          <Icons.Map className="w-3.5 h-3.5" />
          {t('live_map.view_on_map')}
        </button>
      ) : null}

      <button
        type="button"
        disabled
        title={t('helper_profile.chat_locked_hint')}
        className="mt-2 w-full py-2 cursor-not-allowed bg-gray-50 text-gray-400 font-bold text-xs rounded-xl opacity-70"
      >
        {t('live_map.chat')}
      </button>
    </article>
  );
}
