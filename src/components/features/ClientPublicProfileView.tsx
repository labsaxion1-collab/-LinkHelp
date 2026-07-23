import { ArrowRight } from 'lucide-react';
import type { Job } from '@/types/job';
import { useLanguage } from '@/context/LanguageContext';
import { PublicProfileHero } from '@/components/reputation/PublicProfileHero';
import { ReputationDossierPanel } from '@/components/reputation/ReputationDossierPanel';
import { getLevelsFor } from '@/gamification/engines/levelEngine';
import { usePublicGamificationProfiles } from '@/gamification/hooks/usePublicGamificationProfile';
import { usePublicReputationDossier } from '@/hooks/usePublicReputationDossier';

type Props = {
  job: Job;
  onCta?: () => void;
  ctaLabel?: string;
  bio?: string | null;
};

export function ClientPublicProfileView({ job, onCta, ctaLabel, bio }: Props) {
  const { t } = useLanguage();
  const location =
    [job.city, job.region].filter(Boolean).join(', ') || job.location || null;
  const { profiles } = usePublicGamificationProfiles([job.clientId], 'client');
  const heroKey = profiles.get(job.clientId)?.heroKey ?? 'client_novo';
  const levelName =
    getLevelsFor('client').find((level) => level.heroKey === heroKey)?.name ??
    getLevelsFor('client')[0].name;
  const dossier = usePublicReputationDossier({
    userId: job.clientId,
    role: 'client',
    averageRating: job.clientRating ?? null,
  });

  const showPositiveHistory =
    dossier.completedCount > 0 && (dossier.averageRating >= 4.5 || dossier.averageRating === 0);

  return (
    <div className="space-y-3">
      <PublicProfileHero
        userId={job.clientId}
        userType="client"
        name={job.clientName}
        avatar={job.clientAvatar}
        location={location}
        roleLabel={t('app_pages.settings_mode_client')}
        levelLabel={levelName}
        rating={job.clientRating}
        reviewCount={dossier.reviewCount}
        noReviewsLabel={t('profile_page.no_reviews_yet')}
        reviewsCountLabel={(count) => t('profile_page.reviews_count', { count })}
        showPositiveHistory={showPositiveHistory && dossier.averageRating >= 4.5}
        positiveHistoryLabel={t('profile_page.public_positive_history')}
        metrics={[
          {
            key: 'rating',
            label: t('reputation_dossier.avg_rating'),
            value:
              job.clientRating != null && job.clientRating > 0
                ? job.clientRating.toFixed(1)
                : '—',
          },
          {
            key: 'completed',
            label: t('reputation_dossier.orders_completed'),
            value: String(dossier.completedCount),
          },
          {
            key: 'published',
            label: t('reputation_dossier.orders_published'),
            value: String(dossier.publishedCount ?? 0),
          },
        ]}
      />

      {bio?.trim() ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
            {t('profile_page.public_about')} {job.clientName.split(/\s+/)[0]}
          </p>
          <p className="mt-2 text-sm font-medium leading-relaxed text-slate-700">{bio.trim()}</p>
        </section>
      ) : null}

      <ReputationDossierPanel
        userId={job.clientId}
        role="client"
        displayName={job.clientName}
        avatar={job.clientAvatar}
        subtitle={location}
        averageRating={job.clientRating ?? null}
        detailsOnly
      />

      {onCta ? (
        <button
          type="button"
          onClick={onCta}
          className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-[#2563FF] px-4 text-sm font-black text-white shadow-[0_12px_28px_rgba(37,99,255,0.28)]"
        >
          {ctaLabel || t('profile_page.public_cta_orders')}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
