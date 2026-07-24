import { BriefcaseBusiness, UserRound } from 'lucide-react';
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
  verified?: boolean;
  onCta?: () => void;
  ctaLabel?: string;
};

type Props = { helper: HelperPublicProfileData; onClose?: () => void; closeLabel?: string };

const integratedDossierClasses = 'space-y-5 [&>div]:rounded-none [&>div]:border-0 [&>div]:border-t [&>div]:border-white/10 [&>div]:bg-transparent [&>div]:px-0 [&>div]:pb-0 [&>div]:pt-5 [&_.text-slate-400]:text-white/45 [&_.text-slate-500]:text-white/55 [&_.text-slate-600]:text-white/65 [&_.text-slate-700]:text-white/75 [&_.text-slate-800]:text-white/85 [&_.text-slate-900]:text-white [&_li]:border-white/10 [&_li]:bg-white/[0.04] [&_.bg-slate-50]:bg-white/[0.04] [&_.bg-slate-50\/80]:bg-white/[0.04]';

export function HelperPublicProfileView({ helper, onClose, closeLabel }: Props) {
  const { t, language } = useLanguage();
  const { profiles } = usePublicGamificationProfiles([helper.id], 'helper');
  const heroKey = profiles.get(helper.id)?.heroKey ?? 'helper_novo';
  const levelName = getLevelsFor('helper').find((level) => level.heroKey === heroKey)?.name ?? getLevelsFor('helper')[0].name;
  const dossier = usePublicReputationDossier({ userId: helper.id, role: 'helper', averageRating: helper.rating, completedCount: helper.jobsCompleted });
  const memberDate = dossier.memberSince ? new Intl.DateTimeFormat(language, { month: 'short', year: 'numeric' }).format(new Date(dossier.memberSince)) : null;
  const firstName = helper.name.split(/\s+/)[0];

  return (
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
      noReviewsLine1={t('profile_page.no_reviews_line_1')}
      noReviewsLine2={t('profile_page.no_reviews_line_2')}
      reviewsCountLabel={(count) => t('profile_page.reviews_count', { count })}
      verified={helper.verified}
      memberSinceLabel={memberDate ? t('reputation_dossier.member_since', { date: memberDate }) : null}
      completedSummary={dossier.completedCount > 0 ? t('profile_page.public_services_completed_count', { count: dossier.completedCount }) : null}
      achievementsLabel={t('gamification.achievements_title')}
      onClose={onClose}
      closeLabel={closeLabel}
      onCta={helper.onCta}
      ctaLabel={helper.ctaLabel || t('profile_page.public_cta_services')}
      details={<ReputationDossierPanel userId={helper.id} role="helper" displayName={helper.name} avatar={helper.avatar} subtitle={helper.city ?? null} averageRating={helper.rating} completedCount={helper.jobsCompleted} detailsOnly className={integratedDossierClasses} />}
      metrics={[
        { key: 'rating', label: t('reputation_dossier.avg_rating'), value: helper.rating > 0 ? helper.rating.toFixed(1) : '—' },
        { key: 'completed', label: t('reputation_dossier.services_completed'), value: String(helper.jobsCompleted) },
        { key: 'reviews', label: t('reputation_dossier.reviews_received'), value: String(dossier.reviewCount) },
      ]}
    >
      <section>
        <h3 className="flex items-center gap-2 text-sm font-black text-white"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0D53B7]/30 text-[#50A7FF] ring-1 ring-[#2684FF]/25"><UserRound className="h-4 w-4" /></span>{t('profile_page.public_about')} {firstName}</h3>
        <p className="mt-3 text-sm font-medium leading-relaxed text-white/65">{helper.bio?.trim() || t('profile_page.public_no_bio')}</p>
      </section>

      {helper.categories.length > 0 ? <section className="border-t border-white/10 pt-5"><h3 className="flex items-center gap-2 text-sm font-black text-white"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0D53B7]/30 text-[#50A7FF] ring-1 ring-[#2684FF]/25"><BriefcaseBusiness className="h-4 w-4" /></span>{t('profile_page.public_services')}</h3><div className="mt-3 flex flex-wrap gap-2">{helper.categories.map((category) => { const theme = getCategoryFeedTheme(category); return <span key={category} className="rounded-lg px-2.5 py-1 text-xs font-bold" style={{ color: theme.iconColor, backgroundColor: theme.iconBg }}>{translateCategory(category, t)}</span>; })}</div></section> : null}


    </PublicProfileHero>
  );
}