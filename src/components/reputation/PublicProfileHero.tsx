import type { ReactNode } from 'react';
import { ArrowRight, BadgeCheck, Calendar, MapPin, Pencil, Star, ThumbsUp, Trophy, X } from 'lucide-react';
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
  rating?: number | null;
  reviewCount?: number;
  metrics: Metric[];
  noReviewsLabel: string;
  noReviewsLine1?: string;
  noReviewsLine2?: string;
  reviewsCountLabel: (count: number) => string;
  verified?: boolean;
  showPositiveHistory?: boolean;
  positiveHistoryLabel?: string;
  memberSinceLabel?: string | null;
  completedSummary?: string | null;
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
  userId, userType, name, avatar, location, roleLabel, levelLabel, levelCaption, rating,
  reviewCount = 0, metrics, noReviewsLabel, noReviewsLine1, noReviewsLine2, reviewsCountLabel, verified = false,
  showPositiveHistory = false, positiveHistoryLabel, memberSinceLabel,
  completedSummary, achievementsLabel, children, details, onClose, closeLabel,
  onCta, ctaLabel, onEdit, editLabel, className,
}: Props) {
  const { profiles } = usePublicGamificationProfiles([userId], userType);
  const publicProfile = profiles.get(userId);
  // Every account starts at the real "novo" level even before a public gamification row exists.
  const heroKey = publicProfile?.heroKey ?? `${userType}_novo`;
  const medalSrc = MEDAL_MAP[heroKey] ?? MEDAL_MAP[`${userType}_novo`];
  const hasRating = rating != null && rating > 0;
  const initials = profileInitials(name);

  return (
    <section className={clsx('relative overflow-hidden rounded-[1.75rem] border border-[#1677FF]/55 bg-[#030D27] p-4 text-white shadow-[0_24px_60px_rgba(2,12,38,0.38)] sm:p-5', className)}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_8%,rgba(31,111,255,0.22),transparent_34%),linear-gradient(145deg,rgba(10,40,101,0.98)_0%,rgba(3,13,39,0.99)_58%,rgba(1,8,25,1)_100%)]" />
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-45" viewBox="0 0 640 960" preserveAspectRatio="none" aria-hidden>
        <path d="M-55 170 C 110 40, 250 290, 430 155 S 650 18, 720 85" fill="none" stroke="rgba(41,133,255,.42)" strokeWidth="1.5" />
        <path d="M-80 435 C 150 305, 290 520, 675 330" fill="none" stroke="rgba(74,172,255,.18)" strokeWidth="1" />
      </svg>

      {onClose ? (
        <button type="button" onClick={onClose} aria-label={closeLabel} className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-white/80 transition hover:bg-white/12 hover:text-white">
          <X className="h-5 w-5" />
        </button>
      ) : null}

      <div className="relative flex items-center gap-4 pr-0 pt-2 min-[390px]:gap-5 min-[390px]:pr-10 sm:pt-3">
        <div className="relative shrink-0">
          <div className="h-28 w-28 overflow-hidden rounded-full bg-white/10 ring-[4px] ring-[#2388FF] shadow-[0_0_32px_rgba(35,136,255,0.38)] min-[390px]:h-32 min-[390px]:w-32 sm:h-36 sm:w-36">
            {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-2xl font-black">{initials}</div>}
          </div>
          {verified ? <span className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-[#2563FF] ring-2 ring-[#06122F]"><BadgeCheck className="h-4 w-4 text-white" aria-hidden /></span> : null}
        </div>

        <div className="min-w-0 flex-1">
          <p className="break-words text-xl font-black leading-tight sm:text-2xl">{name}</p>
          <div className="mt-2 flex min-w-0 items-center gap-2.5 sm:gap-3">
            {medalSrc ? (
              <img
                src={medalSrc}
                alt={levelLabel || roleLabel}
                className="h-[4.5rem] w-[4.5rem] shrink-0 object-contain drop-shadow-[0_10px_24px_rgba(37,99,255,0.42)] min-[390px]:h-[5.5rem] min-[390px]:w-[5.5rem] sm:h-24 sm:w-24"
                loading="lazy"
              />
            ) : null}
            <div className="min-w-0">
              {levelLabel ? (
                <p className="mb-1.5 text-[11px] font-bold leading-tight text-white/80">
                  {levelCaption ? (
                    <span className="mb-0.5 block text-[9px] font-black uppercase tracking-wide text-white/45">
                      {levelCaption}
                    </span>
                  ) : null}
                  <span className="truncate">{levelLabel}</span>
                </p>
              ) : null}
              <div className="flex min-h-14 flex-wrap items-center gap-2">

                {hasRating ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-300/15 px-2.5 py-1 text-[11px] font-black text-amber-100">
                    <Star className="h-3 w-3 fill-amber-300 text-amber-300" aria-hidden />
                    {rating!.toFixed(1)}
                    {reviewCount > 0 ? <span className="font-semibold text-white/65">({reviewsCountLabel(reviewCount)})</span> : null}
                  </span>
                ) : (
                  <span className="inline-flex min-h-12 min-w-[6.5rem] flex-col items-start justify-center rounded-xl border border-white/10 bg-white/[0.06] px-3 text-[11px] font-semibold leading-[1.15] text-white/60">{noReviewsLine1 && noReviewsLine2 ? <><span className="whitespace-nowrap">{noReviewsLine1}</span><span className="whitespace-nowrap">{noReviewsLine2}</span></> : <span>{noReviewsLabel}</span>}</span>
                )}
              </div>
              {location ? (
                <p className="mt-2 flex min-w-0 items-center gap-1 text-xs font-semibold text-white/60">
                  <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{location}</span>
                </p>
              ) : null}
            </div>
          </div>
        </div>      </div>

      {onEdit && editLabel ? (
        <button
          type="button"
          onClick={onEdit}
          className="relative mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 text-[11px] font-bold text-[#9CC8FF] transition hover:bg-white/12 hover:text-white"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden />
          {editLabel}
        </button>
      ) : null}

      {memberSinceLabel || completedSummary ? <div className="relative mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-semibold text-white/55">{memberSinceLabel ? <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{memberSinceLabel}</span> : null}{completedSummary ? <span>{completedSummary}</span> : null}</div> : null}

      {metrics.length > 0 ? <div className="relative mt-4 grid grid-cols-3 divide-x divide-white/15 rounded-2xl border border-[#2B78CF]/25 bg-black/20 px-1 py-3 backdrop-blur-sm">{metrics.map((metric) => <div key={metric.key} className="min-w-0 px-1.5 text-center"><p className="truncate text-base font-black tabular-nums text-white sm:text-lg">{metric.value}</p><p className="mt-1 line-clamp-2 text-[8px] font-bold uppercase leading-tight tracking-wide text-white/50 sm:text-[9px]">{metric.label}</p></div>)}</div> : null}

      {showPositiveHistory && positiveHistoryLabel ? <p className="relative mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[11px] font-bold text-emerald-100 ring-1 ring-emerald-300/20"><ThumbsUp className="h-3.5 w-3.5" aria-hidden />{positiveHistoryLabel}</p> : null}

      <div className="relative mt-5 space-y-5 border-t border-white/10 pt-5">{children}</div>

      {achievementsLabel && medalSrc ? <section className="relative mt-5 border-t border-white/10 pt-5"><h3 className="flex items-center gap-2 text-sm font-black text-white"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0D53B7]/30 text-[#50A7FF] ring-1 ring-[#2684FF]/25"><Trophy className="h-4 w-4" /></span>{achievementsLabel}</h3><div className="mt-3"><img src={medalSrc} alt={levelLabel || roleLabel} className="h-28 w-28 object-contain drop-shadow-[0_12px_26px_rgba(37,99,255,0.38)] sm:h-32 sm:w-32" loading="lazy" /></div></section> : null}

      {details}

      {onCta && ctaLabel ? <button type="button" onClick={onCta} className="relative mt-6 inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0878F9] to-[#215BEA] px-4 text-sm font-black text-white shadow-[0_14px_30px_rgba(22,102,244,0.3)] transition hover:brightness-110">{ctaLabel}<ArrowRight className="h-4 w-4" aria-hidden /></button> : null}
    </section>
  );
}
