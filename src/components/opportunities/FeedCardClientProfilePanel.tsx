import { Globe, MapPin, Medal, Star, UserRound } from 'lucide-react';
import type { Job } from '@/types/job';
import { useLanguage } from '@/context/LanguageContext';
import { getSpokenLanguageLabel } from '@/data/spokenLanguages';
import { getLevelsFor } from '@/gamification/engines/levelEngine';
import { usePublicGamificationProfiles } from '@/gamification/hooks/usePublicGamificationProfile';
import { usePublicReputationDossier } from '@/hooks/usePublicReputationDossier';
import { usePublicProfileExtras } from '@/hooks/usePublicProfileExtras';
import {
  FEED_CARD_PREMIUM_CHIP_CLASS,
  FEED_CARD_PREMIUM_ICON_GOLD_CLASS,
  FEED_CARD_PREMIUM_ICON_LIGHT_CLASS,
  FEED_CARD_PREMIUM_ICON_WHITE_CLASS,
  FEED_CARD_PREMIUM_LEVEL_BADGE_CLASS,
  FEED_CARD_PREMIUM_RATING_BADGE_CLASS,
  FEED_CARD_PREMIUM_SCORE_BADGE_CLASS,
} from '@/components/opportunities/feedCardPremiumTheme';

type Props = {
  job: Job;
};

function clientInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  return (parts[0]?.slice(0, 2) ?? '?').toUpperCase();
}

/**
 * Compact client public profile for the feed card PROFILE state.
 * Reuses P2.2/P2.3 public data hooks — never selects phone/email/street/postal/coords.
 * P3.3: premium visual only (light-on-navy); data/logic unchanged.
 */
export function FeedCardClientProfilePanel({ job }: Props) {
  const { t } = useLanguage();
  const extras = usePublicProfileExtras(job.clientId);
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

  const location =
    [job.city, job.region].filter(Boolean).join(', ') ||
    extras.locationLabel ||
    null;
  const bio = extras.bio?.trim() || null;
  const languageLabels = extras.spokenLanguages.map((code) => getSpokenLanguageLabel(code, t));
  const ratingValue =
    job.clientRating != null && job.clientRating > 0 ? job.clientRating : dossier.averageRating;
  const hasRating = ratingValue != null && ratingValue > 0 && dossier.reviewCount > 0;
  const avatarOk = Boolean(job.clientAvatar && !job.clientAvatar.includes('pravatar'));

  return (
    <div className="space-y-2" data-testid="feed-card-profile-content">
      <div className="flex items-center gap-2">
        {avatarOk ? (
          <img
            src={job.clientAvatar}
            alt=""
            className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-white/25"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-sm font-black text-white">
            {clientInitials(job.clientName)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="flex min-w-0 items-center gap-1.5 text-[14px] font-black text-white">
            <UserRound className="h-3.5 w-3.5 shrink-0 text-white" aria-hidden />
            <span className="truncate">{job.clientName}</span>
          </p>
          <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-1.5">
            <span className={FEED_CARD_PREMIUM_LEVEL_BADGE_CLASS} data-testid="feed-card-level-badge">
              <Medal className="h-3 w-3 shrink-0 text-amber-300" aria-hidden />
              <span className="truncate">
                {t('profile_page.public_level')}: {levelName}
              </span>
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className={FEED_CARD_PREMIUM_SCORE_BADGE_CLASS} data-testid="feed-card-score-badge">
          <span className="text-[10px] font-bold uppercase tracking-wide text-sky-100/85">
            {t('reputation_dossier.score')}
          </span>
          <span className="text-[13px] font-black tabular-nums text-white">{dossier.trustScore}</span>
        </span>
        <span className={FEED_CARD_PREMIUM_RATING_BADGE_CLASS} data-testid="feed-card-rating-badge">
          <span className="text-[10px] font-bold uppercase tracking-wide text-amber-100/85">
            {t('profile_page.overall_rating')}
          </span>
          {hasRating ? (
            <>
              <Star
                className={`${FEED_CARD_PREMIUM_ICON_GOLD_CLASS} fill-amber-300`}
                aria-hidden
              />
              <span className="text-[13px] font-black tabular-nums text-white">
                {ratingValue.toFixed(1)}
              </span>
              <span className="text-[10px] font-semibold text-white/60">({dossier.reviewCount})</span>
            </>
          ) : (
            <span className="text-[11px] font-semibold text-white/55">
              {t('profile_page.no_reviews_yet')}
            </span>
          )}
        </span>
      </div>

      {dossier.completedCount > 0 ? (
        <p className="text-[12px] font-semibold text-white/85">
          {t('profile_page.public_orders_completed_count', { count: dossier.completedCount })}
        </p>
      ) : null}

      {location ? (
        <p className="flex min-w-0 items-center gap-1.5 text-[12px] font-semibold text-white/85">
          <MapPin className={FEED_CARD_PREMIUM_ICON_LIGHT_CLASS} aria-hidden />
          <span className="truncate">{location}</span>
        </p>
      ) : null}

      {bio ? (
        <section>
          <h4 className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-white/55">
            <UserRound className={FEED_CARD_PREMIUM_ICON_WHITE_CLASS} aria-hidden />
            {t('profile_page.public_about')}
          </h4>
          <p className="mt-0.5 text-[12px] font-medium leading-relaxed text-white/80">{bio}</p>
        </section>
      ) : null}

      {languageLabels.length > 0 ? (
        <section>
          <h4 className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-white/55">
            <Globe className={FEED_CARD_PREMIUM_ICON_LIGHT_CLASS} aria-hidden />
            {t('profile_page.spoken_languages')}
          </h4>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {languageLabels.map((label) => (
              <span key={label} className={FEED_CARD_PREMIUM_CHIP_CLASS}>
                {label}
              </span>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
