import { UserRound } from 'lucide-react';
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
  verified?: boolean;
  onClose?: () => void;
  closeLabel?: string;
};

const integratedDossierClasses = 'space-y-5 [&>div]:rounded-none [&>div]:border-0 [&>div]:border-t [&>div]:border-white/10 [&>div]:bg-transparent [&>div]:px-0 [&>div]:pb-0 [&>div]:pt-5 [&_.text-slate-400]:text-white/45 [&_.text-slate-500]:text-white/55 [&_.text-slate-600]:text-white/65 [&_.text-slate-700]:text-white/75 [&_.text-slate-800]:text-white/85 [&_.text-slate-900]:text-white [&_li]:border-white/10 [&_li]:bg-white/[0.04] [&_.bg-slate-50]:bg-white/[0.04] [&_.bg-slate-50\/80]:bg-white/[0.04]';

export function ClientPublicProfileView({ job, onCta, ctaLabel, bio, verified = false, onClose, closeLabel }: Props) {
  const { t, language } = useLanguage();
  const location = [job.city, job.region].filter(Boolean).join(', ') || job.location || null;
  const { profiles } = usePublicGamificationProfiles([job.clientId], 'client');
  const heroKey = profiles.get(job.clientId)?.heroKey ?? 'client_novo';
  const levelName = getLevelsFor('client').find((level) => level.heroKey === heroKey)?.name ?? getLevelsFor('client')[0].name;
  const dossier = usePublicReputationDossier({ userId: job.clientId, role: 'client', averageRating: job.clientRating ?? null });
  const memberDate = dossier.memberSince ? new Intl.DateTimeFormat(language, { month: 'short', year: 'numeric' }).format(new Date(dossier.memberSince)) : null;
  const firstName = job.clientName.split(/\s+/)[0];
  const showPositiveHistory = dossier.completedCount > 0 && dossier.averageRating >= 4.5;

  return (
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
      noReviewsLine1={t('profile_page.no_reviews_line_1')}
      noReviewsLine2={t('profile_page.no_reviews_line_2')}
      reviewsCountLabel={(count) => t('profile_page.reviews_count', { count })}
      verified={verified}
      showPositiveHistory={showPositiveHistory}
      positiveHistoryLabel={t('profile_page.public_positive_history')}
      memberSinceLabel={memberDate ? t('reputation_dossier.member_since', { date: memberDate }) : null}
      completedSummary={dossier.completedCount > 0 ? t('profile_page.public_orders_completed_count', { count: dossier.completedCount }) : null}
      achievementsLabel={t('gamification.achievements_title')}
      onClose={onClose}
      closeLabel={closeLabel}
      onCta={onCta}
      ctaLabel={ctaLabel || t('profile_page.public_cta_orders')}
      details={<ReputationDossierPanel userId={job.clientId} role="client" displayName={job.clientName} avatar={job.clientAvatar} subtitle={location} averageRating={job.clientRating ?? null} detailsOnly className={integratedDossierClasses} />}
      metrics={[
        { key: 'rating', label: t('reputation_dossier.avg_rating'), value: job.clientRating != null && job.clientRating > 0 ? job.clientRating.toFixed(1) : '—' },
        { key: 'completed', label: t('reputation_dossier.orders_completed'), value: String(dossier.completedCount) },
        { key: 'reviews', label: t('reputation_dossier.reviews_received'), value: String(dossier.reviewCount) },
      ]}
    >
      <section>
        <h3 className="flex items-center gap-2 text-sm font-black text-white"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0D53B7]/30 text-[#50A7FF] ring-1 ring-[#2684FF]/25"><UserRound className="h-4 w-4" /></span>{t('profile_page.public_about')} {firstName}</h3>
        <p className="mt-3 text-sm font-medium leading-relaxed text-white/65">{bio?.trim() || t('profile_page.public_no_bio')}</p>
      </section>


    </PublicProfileHero>
  );
}
