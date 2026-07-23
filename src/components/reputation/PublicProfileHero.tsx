import { BadgeCheck, MapPin, Star, ThumbsUp } from 'lucide-react';
import { clsx } from 'clsx';
import { MEDAL_MAP } from '@/gamification/config/gamificationMedals';
import type { UserType } from '@/gamification/types/gamification';
import { usePublicGamificationProfiles } from '@/gamification/hooks/usePublicGamificationProfile';
import { profileInitials } from '@/components/profile/profileDisplay';

type Metric = {
  key: string;
  label: string;
  value: string;
};

type Props = {
  userId: string;
  userType: UserType;
  name: string;
  avatar?: string | null;
  location?: string | null;
  roleLabel: string;
  levelLabel?: string | null;
  rating?: number | null;
  reviewCount?: number;
  metrics: Metric[];
  noReviewsLabel: string;
  reviewsCountLabel: (count: number) => string;
  showPositiveHistory?: boolean;
  positiveHistoryLabel?: string;
  className?: string;
};

export function PublicProfileHero({
  userId,
  userType,
  name,
  avatar,
  location,
  roleLabel,
  levelLabel,
  rating,
  reviewCount = 0,
  metrics,
  noReviewsLabel,
  reviewsCountLabel,
  showPositiveHistory = false,
  positiveHistoryLabel,
  className,
}: Props) {
  const { profiles } = usePublicGamificationProfiles([userId], userType);
  const publicProfile = profiles.get(userId);
  const heroKey = publicProfile?.heroKey ?? `${userType}_novo`;
  const medalSrc = MEDAL_MAP[heroKey] ?? MEDAL_MAP[`${userType}_novo`];
  const hasRating = rating != null && rating > 0;
  const initials = profileInitials(name);

  return (
    <section
      className={clsx(
        'relative overflow-hidden rounded-[1.6rem] bg-[#06122F] p-4 text-white shadow-[0_18px_40px_rgba(6,18,47,0.28)]',
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(51,182,255,0.22),transparent_35%),linear-gradient(160deg,rgba(17,55,130,0.85)_0%,rgba(6,18,47,0.96)_70%)]" />
      <div className="pointer-events-none absolute -right-8 bottom-0 h-32 w-32 rounded-full border border-white/10 opacity-40" />

      <div className="relative flex items-start gap-3.5">
        <div className="relative shrink-0">
          <div className="h-[4.5rem] w-[4.5rem] overflow-hidden rounded-full bg-white/10 ring-[3px] ring-[#33B6FF]/55">
            {avatar ? (
              <img src={avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xl font-black">
                {initials}
              </div>
            )}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#2563FF] ring-2 ring-[#06122F]">
            <BadgeCheck className="h-3.5 w-3.5 text-white" aria-hidden />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-xl font-black leading-tight">{name}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-black ring-1 ring-white/12">
              {medalSrc ? (
                <img src={medalSrc} alt="" className="h-4 w-4 object-contain" loading="lazy" />
              ) : null}
              <span className="truncate">
                {levelLabel || roleLabel}
              </span>
            </span>
            {hasRating ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-300/15 px-2.5 py-1 text-[11px] font-black text-amber-100">
                <Star className="h-3 w-3 fill-amber-300 text-amber-300" aria-hidden />
                {rating!.toFixed(1)}
                {reviewCount > 0 ? (
                  <span className="font-semibold text-white/65">
                    ({reviewsCountLabel(reviewCount)})
                  </span>
                ) : null}
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-white/50">{noReviewsLabel}</span>
            )}
          </div>
          {location ? (
            <p className="mt-2 flex min-w-0 items-center gap-1 text-xs font-semibold text-white/65">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">{location}</span>
            </p>
          ) : null}
        </div>
      </div>

      {metrics.length > 0 ? (
        <div className="relative mt-4 grid grid-cols-3 gap-2">
          {metrics.map((metric) => (
            <div
              key={metric.key}
              className="rounded-xl border border-white/10 bg-white/8 px-2 py-2.5 text-center backdrop-blur-sm"
            >
              <p className="truncate text-sm font-black tabular-nums text-white">{metric.value}</p>
              <p className="mt-0.5 truncate text-[9px] font-bold uppercase tracking-wide text-white/55">
                {metric.label}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {showPositiveHistory && positiveHistoryLabel ? (
        <p className="relative mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[11px] font-bold text-emerald-100 ring-1 ring-emerald-300/20">
          <ThumbsUp className="h-3.5 w-3.5" aria-hidden />
          {positiveHistoryLabel}
        </p>
      ) : null}
    </section>
  );
}
