import { BriefcaseBusiness, Languages, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { getSpokenLanguageLabel } from '@/data/spokenLanguages';
import { translateCategory } from '@/utils/translateCategory';
import { getCategoryFeedTheme } from '@/utils/categoryFeedTheme';
import { PublicProfileHero } from '@/components/reputation/PublicProfileHero';
import { ReputationDossierPanel } from '@/components/reputation/ReputationDossierPanel';
import { getLevelsFor } from '@/gamification/engines/levelEngine';
import { usePublicGamificationProfiles } from '@/gamification/hooks/usePublicGamificationProfile';
import { usePublicReputationDossier } from '@/hooks/usePublicReputationDossier';
import { usePublicProfileExtras } from '@/hooks/usePublicProfileExtras';
import { ROUTES } from '@/utils/constants';

export type HelperPublicProfileData = {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  jobsCompleted: number;
  bio?: string;
  city?: string;
  categories: string[];
  spokenLanguages?: string[];
  verified?: boolean;
  onCta?: () => void;
  ctaLabel?: string;
};

type Props = { helper: HelperPublicProfileData; onClose?: () => void; closeLabel?: string };

const integratedDossierClasses = 'space-y-5 [&>div]:rounded-none [&>div]:border-0 [&>div]:border-t [&>div]:border-white/10 [&>div]:bg-transparent [&>div]:px-0 [&>div]:pb-0 [&>div]:pt-5 [&_.text-slate-400]:text-white/45 [&_.text-slate-500]:text-white/55 [&_.text-slate-600]:text-white/65 [&_.text-slate-700]:text-white/75 [&_.text-slate-800]:text-white/85 [&_.text-slate-900]:text-white [&_li]:border-white/10 [&_li]:bg-white/[0.04] [&_.bg-slate-50]:bg-white/[0.04] [&_.bg-slate-50\/80]:bg-white/[0.04]';

export function HelperPublicProfileView({ helper, onClose, closeLabel }: Props) {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { session } = useAuth();
  const extras = usePublicProfileExtras(helper.id);
  const { profiles } = usePublicGamificationProfiles([helper.id], 'helper');
  const heroKey = profiles.get(helper.id)?.heroKey ?? 'helper_novo';
  const levelName = getLevelsFor('helper').find((level) => level.heroKey === heroKey)?.name ?? getLevelsFor('helper')[0].name;
  const dossier = usePublicReputationDossier({ userId: helper.id, role: 'helper', averageRating: helper.rating, completedCount: helper.jobsCompleted });
  const memberDate = dossier.memberSince ? new Intl.DateTimeFormat(language, { month: 'short', year: 'numeric' }).format(new Date(dossier.memberSince)) : null;
  const firstName = helper.name.split(/\s+/)[0];

  const isOwnProfile = Boolean(session?.user?.id && session.user.id === helper.id);
  const bio = helper.bio?.trim() || extras.bio || undefined;
  const city = helper.city?.trim() || extras.locationLabel || undefined;
  const spokenLanguages =
    helper.spokenLanguages && helper.spokenLanguages.length > 0
      ? helper.spokenLanguages
      : extras.spokenLanguages;
  const categories =
    helper.categories.length > 0
      ? helper.categories
      : [
          ...(extras.primaryCategory ? [extras.primaryCategory] : []),
          ...extras.secondaryCategories,
        ];
  const ratingValue = helper.rating > 0 ? helper.rating : dossier.averageRating;
  const hasRating = ratingValue != null && ratingValue > 0;
  const languageLabels = spokenLanguages.map((code) => getSpokenLanguageLabel(code, t));

  return (
    <PublicProfileHero
      userId={helper.id}
      userType="helper"
      name={helper.name}
      avatar={helper.avatar}
      location={city}
      roleLabel={t('app_pages.settings_mode_helper')}
      levelLabel={levelName}
      levelCaption={t('profile_page.public_level')}
      rating={hasRating ? ratingValue : null}
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
      onEdit={isOwnProfile ? () => navigate(ROUTES.profilePublicEdit) : undefined}
      editLabel={isOwnProfile ? t('profile_page.edit_public') : undefined}
      details={<ReputationDossierPanel userId={helper.id} role="helper" displayName={helper.name} avatar={helper.avatar} subtitle={city ?? null} averageRating={hasRating ? ratingValue : null} completedCount={helper.jobsCompleted} detailsOnly className={integratedDossierClasses} />}
      metrics={[
        { key: 'rating', label: t('profile_page.overall_rating'), value: hasRating ? ratingValue!.toFixed(1) : '—' },
        { key: 'score', label: t('reputation_dossier.score'), value: dossier.trustScore > 0 ? String(dossier.trustScore) : '—' },
        { key: 'completed', label: t('reputation_dossier.services_completed'), value: String(dossier.completedCount) },
      ]}
    >
      <section>
        <h3 className="flex items-center gap-2 text-sm font-black text-white"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0D53B7]/30 text-[#50A7FF] ring-1 ring-[#2684FF]/25"><UserRound className="h-4 w-4" /></span>{t('profile_page.public_about')} {firstName}</h3>
        <p className="mt-3 text-sm font-medium leading-relaxed text-white/65">{bio || t('profile_page.public_no_bio')}</p>
      </section>

      {languageLabels.length > 0 ? (
        <section className="border-t border-white/10 pt-5">
          <h3 className="flex items-center gap-2 text-sm font-black text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0D53B7]/30 text-[#50A7FF] ring-1 ring-[#2684FF]/25">
              <Languages className="h-4 w-4" />
            </span>
            {t('profile_page.spoken_languages')}
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {languageLabels.map((label) => (
              <span key={label} className="rounded-lg bg-white/[0.08] px-2.5 py-1 text-xs font-bold text-white/80 ring-1 ring-white/10">
                {label}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {categories.length > 0 ? (
        <section className="border-t border-white/10 pt-5">
          <h3 className="flex items-center gap-2 text-sm font-black text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0D53B7]/30 text-[#50A7FF] ring-1 ring-[#2684FF]/25">
              <BriefcaseBusiness className="h-4 w-4" />
            </span>
            {t('profile_page.public_services')}
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {categories.map((category) => {
              const theme = getCategoryFeedTheme(category);
              return (
                <span
                  key={category}
                  className="rounded-lg px-2.5 py-1 text-xs font-bold"
                  style={{ color: theme.iconColor, backgroundColor: theme.iconBg }}
                >
                  {translateCategory(category, t)}
                </span>
              );
            })}
          </div>
        </section>
      ) : null}
    </PublicProfileHero>
  );
}
