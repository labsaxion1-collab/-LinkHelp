import { MapPin } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { translateCategory } from '@/utils/translateCategory';
import { getCategoryFeedTheme } from '@/utils/categoryFeedTheme';
import { ReputationDossierPanel } from '@/components/reputation/ReputationDossierPanel';

export type HelperPublicProfileData = {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  jobsCompleted: number;
  bio?: string;
  city?: string;
  categories: string[];
};

type Props = {
  helper: HelperPublicProfileData;
};

export function HelperPublicProfileView({ helper }: Props) {
  const { t } = useLanguage();

  return (
    <div className="space-y-3">
      <ReputationDossierPanel
        userId={helper.id}
        role="helper"
        displayName={helper.name}
        avatar={helper.avatar}
        subtitle={helper.city ?? null}
        averageRating={helper.rating}
        completedCount={helper.jobsCompleted}
      />

      {helper.bio ? (
        <p className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-medium leading-relaxed text-slate-700">
          {helper.bio}
        </p>
      ) : null}

      {helper.city ? (
        <p className="flex items-center gap-1 text-xs font-medium text-slate-500">
          <MapPin className="h-3.5 w-3.5" />
          {helper.city}
        </p>
      ) : null}

      {helper.categories.length > 0 ? (
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
      ) : null}
    </div>
  );
}
