import type { ReactNode } from 'react';
import { ArrowRight, BadgeCheck, Calendar, MapPin, Pencil, Star, ThumbsUp, X } from 'lucide-react';
import { clsx } from 'clsx';
import { MEDAL_MAP } from '@/gamification/config/gamificationMedals';
import type { UserType } from '@/gamification/types/gamification';
import { usePublicGamificationProfiles } from '@/gamification/hooks/usePublicGamificationProfile';
import { profileInitials } from '@/components/profile/profileDisplay';

type Metric = { key: string; label: string; value: string };

type Props = {
  userId: string;
  userType: UserType;
  name: string;
  avatar?: string | null;
  location?: string | null;
  roleLabel: string;
  levelLabel?: string | null;
  levelCaption?: string | null;
  scoreLabel?: string | null;
  scoreValue?: string | null;
  overallRatingLabel?: string | null;
  rating?: number | null;
  reviewCount?: number;
  /** Optional secondary metrics (e.g. completed count). Keep short — score/rating live in the header stack. */
  metrics?: Metric[];
  noReviewsLabel: string;
  reviewsCountLabel: (count: number) => string;
  verified?: boolean;
  showPositiveHistory?: boolean;
  positiveHistoryLabel?: string;
  memberSinceLabel?: string | null;
  completedSummary?: string | null;
  /**
   * Real achievement content only. When omitted/empty, the achievements block is not rendered
   * (avoids duplicate medal + missing-i18n humanized title).
   */
  achievements?: ReactNode;
  achievementsLabel?: string;
  children?: ReactNode;
  details?: ReactNode;
  onClose?: () => void;
  closeLabel?: string;
  onCta?: () => void;
  ctaLabel?: string;
  onEdit?: () => void;
  editLabel?: string;
  className?: string;
};

export function PublicProfileHero({
  userId, userType, name, avatar, location, roleLabel, levelLabel, levelCaption,
  scoreLabel, scoreValue, overallRatingLabel, rating,
  reviewCount = 0, metrics = [], noReviewsLabel, reviewsCountLabel, verified = false,
  showPositiveHistory = false, positiveHistoryLabel, memberSinceLabel,
  completedSummary, achievements, achievementsLabel, children, details, onClose, closeLabel,
  onCta, ctaLabel, onEdit, editLabel, className,
}: Props) {
  const { profiles } = usePublicGamificationProfiles([userId], userType);
  const publicProfile = profiles.get(userId);
  // Every account starts at the real "novo" level even before a public gamification row exists.
  const heroKey = publicProfile?.heroKey ?? `${userType}_novo`;
  const medalSrc = MEDAL_MAP[heroKey] ?? MEDAL_MAP[`${userType}_novo`];
  // Real rating only: numeric value > 0 AND at least one review (never invent a fake perfect score).
  const hasRating = rating != null && rating > 0 && reviewCount > 0;
  const initials = profileInitials(name);
  const showAchievements = Boolean(achievements && achievementsLabel);

  return (
    <section className={clsx('relative overflow-hidden rounded-[1.75rem] border border-[#1677FF]/55 bg-[#030D27] p-4 text-white shadow-[0_24px_60px_rgba(2,12,38,0.38)] sm:p-5', className)}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_8%,rgba(31,111,255,0.22),transparent_34%),linear-gradient(145deg,rgba(10,40,101,0.98)_0%,rgba(3,13,39,0.99)_58%,rgba(1,8,25,1)_100%)]" />
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-45" viewBox="0 0 640 960" preserveAspectRatio="none" aria-hidden>
        <path d="M-55 170 C 110 40, 250 290, 430 155 S 650 18, 720 85" fill="none" stroke="rgba(41,133,255,.42)" strokeWidth="1.5" />
        <path d="M-80 435 C 150 305, 290 520, 675 330" fill="none" stroke="rgba(74,172,255,.18)" strokeWidth="1" />
      </svg>

      {onClose ? (
        <button type="button" onClick={onClose} aria-label={closeLabel} className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-white/80 transition hover:bg-white/12 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      ) : null}

      {/* Identity: photo + name only */}
      <div className="relative flex items-center gap-3 pr-10 pt-1 sm:gap-4">
        <div className="relative shrink-0">
          <div className="h-20 w-20 overflow-hidden rounded-full bg-white/10 ring-[3px] ring-[#2388FF] shadow-[0_0_24px_rgba(35,136,255,0.32)] sm:h-24 sm:w-24">
            {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-xl font-black">{initials}</div>}
          </div>
          {verified ? <span className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-[#2563FF] ring-2 ring-[#06122F]"><BadgeCheck className="h-3.5 w-3.5 text-white" aria-hidden /></span> : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-black leading-tight sm:text-xl">{name}</p>
          {location ? (
            <p className="mt-1 flex min-w-0 items-center gap-1 text-xs font-semibold text-white/60">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">{location}</span>
            </p>
          ) : null}
          {onEdit && editLabel ? (
            <button
              type="button"
              onClick={onEdit}
              className="mt-2 inline-flex min-h-8 items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-2.5 text-[11px] font-bold text-[#9CC8FF] transition hover:bg-white/12 hover:text-white"
            >
              <Pencil className="h-3 w-3" aria-hidden />
              {editLabel}
            </button>
          ) : null}
        </div>
      </div>

      {/* Rank stack: medal → level → score → overall rating (never beside the medal) */}
      <div className="relative mt-4 flex flex-col items-start gap-2 border-t border-white/10 pt-4">
        {medalSrc ? (
          <img
            src={medalSrc}
            alt={levelLabel || roleLabel}
            data-testid="public-profile-medal"
            className="h-16 w-16 shrink-0 object-contain drop-shadow-[0_8px_18px_rgba(37,99,255,0.4)] sm:h-20 sm:w-20"
            loading="lazy"
          />
        ) : null}

        {levelLabel ? (
          <p className="max-w-full text-sm font-bold leading-snug text-white/90" data-testid="public-profile-level">
            <span className="font-semibold text-white/50">{levelCaption ? `${levelCaption}: ` : ''}</span>
            <span className="break-words">{levelLabel}</span>
          </p>
        ) : null}

        {scoreLabel ? (
          <p className="max-w-full text-sm font-bold tabular-nums text-white/90" data-testid="public-profile-score">
            <span className="font-semibold text-white/50">{scoreLabel}: </span>
            <span>{scoreValue ?? '—'}</span>
          </p>
        ) : null}

        <div className="max-w-full min-w-0" data-testid="public-profile-rating">
          {overallRatingLabel ? (
            <p className="text-[11px] font-bold uppercase tracking-wide text-white/45">{overallRatingLabel}</p>
          ) : null}
          {hasRating ? (
            <p className="mt-0.5 inline-flex max-w-full min-w-0 items-center gap-1.5 text-sm font-black tabular-nums text-amber-100">
              <Star className="h-3.5 w-3.5 shrink-0 fill-amber-300 text-amber-300" aria-hidden />
              <span className="truncate">{rating!.toFixed(1)}</span>
              {reviewCount > 0 ? (
                <span className="truncate font-semibold text-white/55">({reviewsCountLabel(reviewCount)})</span>
              ) : null}
            </p>
          ) : (
            <p className="mt-0.5 text-sm font-semibold text-white/55">{noReviewsLabel}</p>
          )}
        </div>
      </div>

      {memberSinceLabel || completedSummary ? (
        <div className="relative mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-white/55">
          {memberSinceLabel ? (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{memberSinceLabel}</span>
            </span>
          ) : null}
          {completedSummary ? <span className="truncate">{completedSummary}</span> : null}
        </div>
      ) : null}

      {metrics.length > 0 ? (
        <div className="relative mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {metrics.map((metric) => (
            <div key={metric.key} className="min-w-0 rounded-xl border border-[#2B78CF]/25 bg-black/20 px-3 py-2">
              <p className="truncate text-base font-black tabular-nums text-white">{metric.value}</p>
              <p className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-wide text-white/50">{metric.label}</p>
            </div>
          ))}
        </div>
      ) : null}

      {showPositiveHistory && positiveHistoryLabel ? (
        <p className="relative mt-3 inline-flex max-w-full items-center gap-1.5 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[11px] font-bold text-emerald-100 ring-1 ring-emerald-300/20">
          <ThumbsUp className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate">{positiveHistoryLabel}</span>
        </p>
      ) : null}

      {children ? <div className="relative mt-4 space-y-4 border-t border-white/10 pt-4">{children}</div> : null}

      {showAchievements ? (
        <section className="relative mt-4 max-h-40 overflow-hidden border-t border-white/10 pt-4" data-testid="public-profile-achievements">
          <h3 className="text-xs font-bold uppercase tracking-wide text-white/55">{achievementsLabel}</h3>
          <div className="mt-2">{achievements}</div>
        </section>
      ) : null}

      {details}

      {onCta && ctaLabel ? (
        <button
          type="button"
          onClick={onCta}
          className="relative mt-5 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0878F9] to-[#215BEA] px-4 text-sm font-black text-white shadow-[0_14px_30px_rgba(22,102,244,0.3)] transition hover:brightness-110"
        >
          {ctaLabel}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
    </section>
  );
}
