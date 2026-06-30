import { Star, MapPin, Clock, Shield } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { HelperScorePanel } from '@/components/features/HelperScorePanel';
import { translateCategory } from '@/utils/translateCategory';
import { getCategoryFeedTheme } from '@/utils/categoryFeedTheme';

import { LinkHelpRankBadgeFromStats } from '@/components/ranking/LinkHelpRankBadge';

export type HelperPublicProfileData = {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  jobsCompleted: number;
  bio?: string;
  city?: string;
  categories: string[];
  recentActivity?: string[];
};

type Props = {
  helper: HelperPublicProfileData;
  onClose?: () => void;
};

export function HelperPublicProfileView({ helper }: Props) {
  const { t, language } = useLanguage();

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4">
        <img src={helper.avatar} alt="" className="h-16 w-16 rounded-2xl border border-slate-200 object-cover" />
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-black text-slate-950">{helper.name}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm font-semibold text-amber-600">
            {helper.rating > 0 ? (
              <>
                <Star className="h-4 w-4 fill-amber-400" />
                {helper.rating.toFixed(1)}
              </>
            ) : null}
            {helper.jobsCompleted > 0 ? (
              <>
                {helper.rating > 0 ? <span className="text-slate-400">·</span> : null}
                <span className="text-slate-600">{t('helper_public.jobs_done', { count: helper.jobsCompleted })}</span>
              </>
            ) : null}
          </div>
          <div className="mt-2">
            <LinkHelpRankBadgeFromStats
              role="helper"
              completedCount={helper.jobsCompleted}
              averageRating={helper.rating}
              requireCompleted
              size="sm"
              showLabel
              t={t}
            />
          </div>
          {helper.city ? (
            <p className="mt-1 flex items-center gap-1 text-xs font-medium text-slate-500">
              <MapPin className="h-3.5 w-3.5" />
              {helper.city}
            </p>
          ) : null}
        </div>
      </div>

      {helper.bio ? (
        <p className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-medium leading-relaxed text-slate-700">
          {helper.bio}
        </p>
      ) : null}

      <HelperScorePanel />

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{t('helper_public.categories')}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {helper.categories.map((c) => {
            const theme = getCategoryFeedTheme(c);
            return (
              <span
                key={c}
                className="rounded-lg px-2.5 py-1 text-xs font-bold"
                style={{ color: theme.iconColor, backgroundColor: theme.iconBg }}
              >
                {translateCategory(c, t)}
              </span>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
          <Clock className="mx-auto h-4 w-4 text-blue-600" />
          <p className="mt-1 text-[10px] font-bold text-slate-500">{t('helper_public.punctuality')}</p>
          <p className="text-sm font-black text-slate-900">98%</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
          <Shield className="mx-auto h-4 w-4 text-emerald-600" />
          <p className="mt-1 text-[10px] font-bold text-slate-500">{t('helper_public.quality')}</p>
          <p className="text-sm font-black text-slate-900">4.8</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
          <Star className="mx-auto h-4 w-4 text-amber-500" />
          <p className="mt-1 text-[10px] font-bold text-slate-500">{t('helper_public.organization')}</p>
          <p className="text-sm font-black text-slate-900">4.6</p>
        </div>
      </div>

      {helper.recentActivity?.length ? (
        <div>
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{t('helper_public.recent')}</p>
          <ul className="mt-2 space-y-1.5 text-sm font-medium text-slate-600">
            {helper.recentActivity.map((line) => (
              <li key={line} className="rounded-lg bg-slate-50 px-3 py-2">
                {line}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {helper.rating > 0 ? (
        <p className="text-center text-xs font-medium text-slate-500">
          {t('helper_public.avg_rating', { rating: helper.rating.toFixed(1) })}
        </p>
      ) : (
        <p className="text-center text-xs font-medium text-slate-400">
          {t('helper_public.reviews_placeholder')}
        </p>
      )}
    </div>
  );
}
