import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { translateCategory } from '@/utils/translateCategory';
import { getCategoryFeedTheme } from '@/utils/categoryFeedTheme';
import { PublicProfileHero } from '@/components/reputation/PublicProfileHero';
import { ReputationDossierPanel } from '@/components/reputation/ReputationDossierPanel';
import { getLevelsFor } from '@/gamification/engines/levelEngine';
import { usePublicGamificationProfiles } from '@/gamification/hooks/usePublicGamificationProfile';
import { usePublicReputationDossier } from '@/hooks/usePublicReputationDossier';

export type HelperPublicProfileData = {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  jobsCompleted: number;
  bio?: string;
  city?: string;
  categories: string[];
  onCta?: () => void;
  ctaLabel?: string;
};

type Props = {
  helper: HelperPublicProfileData;
};

export function HelperPublicProfileView({ helper }: Props) {
  const { t } = useLanguage();
  const { profiles } = usePublicGamificationProfiles([helper.id], 'helper');
  const heroKey = profiles.get(helper.id)?.heroKey ?? 'helper_novo';
  const levelName =
    getLevelsFor('helper').find((level) => level.heroKey === heroKey)?.name ??
    getLevelsFor('helper')[0].name;
  const dossier = usePublicReputationDossier({
    userId: helper.id,
    role: 'helper',
    averageRating: helper.rating,
    completedCount: helper.jobsCompleted,
  });

  return (
    <div className="space-y-3">
      <PublicProfileHero
        userId={helper.id}
        userType="helper"
        name={helper.name}
        avatar={helper.avatar}
        location={helper.city}
        roleLabel={t('app_pages.settings_mode_helper')}
        levelLabel={levelName}
        rating={helper.rating}
        reviewCount={dossier.reviewCount}
        noReviewsLabel={t('profile_page.no_reviews_yet')}
        reviewsCountLabel={(count) => t('profile_page.reviews_count', { count })}
        metrics={[
          {
            key: 'rating',
            label: t('reputation_dossier.avg_rating'),
            value: helper.rating > 0 ? helper.rating.toFixed(1) : '—',
          },
          {
            key: 'completed',
            label: t('reputation_dossier.services_completed'),
            value: String(helper.jobsCompleted),
          },
          {
            key: 'reviews',
            label: t('reputation_dossier.reviews_received'),
            value: String(dossier.reviewCount),
          },
        ]}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
          {t('profile_page.public_about')} {helper.name.split(/\s+/)[0]}
        </p>
        <p className="mt-2 text-sm font-medium leading-relaxed text-slate-700">
          {helper.bio?.trim() || t('profile_page.public_no_bio')}
        </p>
      </section>

      {helper.categories.length > 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
            {t('profile_page.public_services')}
          </p>
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
        </section>
      ) : null}

      <ReputationDossierPanel
        userId={helper.id}
        role="helper"
        displayName={helper.name}
        avatar={helper.avatar}
        subtitle={helper.city ?? null}
        averageRating={helper.rating}
        completedCount={helper.jobsCompleted}
        detailsOnly
      />

      {helper.onCta ? (
        <button
          type="button"
          onClick={helper.onCta}
          className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-[#2563FF] px-4 text-sm font-black text-white shadow-[0_12px_28px_rgba(37,99,255,0.28)]"
        >
          {helper.ctaLabel || t('profile_page.public_cta_services')}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
