import * as Icons from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserPresenceBadge } from '@/components/ui/UserPresenceBadge';
import { parseSkillKey } from '@/data/helperSkillsCatalog';
import type { NearbyHelperMapPoint } from '@/types/nearbyHelper';
import { avatarUrlForName } from '@/utils/avatarUrl';
import { ROUTES } from '@/utils/constants';

type Props = {
  helper: NearbyHelperMapPoint;
  t: (key: string, vars?: Record<string, string | number>) => string;
  skillLabel: (skillId: string) => string;
};

export function NearbyHelperListItem({ helper, t, skillLabel }: Props) {
  const navigate = useNavigate();

  return (
    <article className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:border-blue-200 transition-all">
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

      <button type="button" onClick={() => navigate(ROUTES.messages)} className="mt-3 w-full py-2 bg-gray-50 hover:bg-blue-600 hover:text-white text-gray-700 font-bold text-xs rounded-xl transition-colors">
        {t('live_map.chat')}
      </button>
    </article>
  );
}
