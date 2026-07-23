import { BadgeCheck, ExternalLink, MapPin, Star } from 'lucide-react';
import { useGamification } from '@/gamification/hooks/useGamification';
import { MEDAL_MAP } from '@/gamification/config/gamificationMedals';
import { getCurrentLevelConfig } from '@/gamification/engines/levelEngine';
import type { UserType } from '@/gamification/types/gamification';
import { formatProfileLocation, profileInitials } from '@/components/profile/profileDisplay';

type Props = {
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
  roleLabel: string;
  userType: UserType;
  city?: string | null;
  region?: string | null;
  rating?: number | null;
  reviewCount?: number;
  onViewPublic: () => void;
  viewPublicLabel: string;
  noReviewsLabel: string;
  reviewsCountLabel: (count: number) => string;
};

function shortLevelName(name: string) {
  return name
    .replace(/^Cliente\s+/i, '')
    .replace(/^Helper\s+/i, '')
    .replace(/^Lenda\s+LinkHelp$/i, 'Lenda')
    .trim();
}

export function ProfileIdentityHero({
  name,
  email,
  avatarUrl,
  roleLabel,
  userType,
  city,
  region,
  rating,
  reviewCount = 0,
  onViewPublic,
  viewPublicLabel,
  noReviewsLabel,
  reviewsCountLabel,
}: Props) {
  const { record, loading } = useGamification(userType);
  const levelKey = record?.levelKey ?? 'novo';
  const heroKey = record?.heroKey ?? `${userType}_novo`;
  const medalSrc = MEDAL_MAP[heroKey] ?? MEDAL_MAP[`${userType}_novo`];
  const levelName = shortLevelName(getCurrentLevelConfig(userType, levelKey).name);
  const location = formatProfileLocation(city, region);
  const initials = profileInitials(name, email);
  const hasRating = rating != null && rating > 0;

  return (
    <section className="relative w-full overflow-hidden bg-[#071A50] text-white shadow-[0_18px_42px_rgba(8,24,72,0.22)] lg:mx-auto lg:max-w-6xl lg:rounded-b-[2.25rem]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_12%_0%,rgba(31,111,255,0.72),transparent_46%),linear-gradient(135deg,#123FC1_0%,#0B2A78_46%,#06133D_100%)]" />
      <div className="pointer-events-none absolute -right-20 -top-16 h-72 w-72 rounded-full border border-[#33B6FF]/20" />

      <div className="relative flex justify-end px-5 pt-5 sm:px-8 sm:pt-7">
        <button
          type="button"
          onClick={onViewPublic}
          className="inline-flex min-h-[42px] items-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-4 text-[12px] font-bold text-white transition hover:bg-white/10"
        >
          {viewPublicLabel}
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>

      <div className="relative mx-auto mt-3 flex w-full max-w-3xl items-center gap-5 px-5 sm:gap-7 sm:px-8">
        <div className="relative shrink-0">
          <div className="h-28 w-28 overflow-hidden rounded-full bg-gradient-to-br from-[#2F7BFF] via-[#19C5FF] to-[#0B4ED8] p-[4px] shadow-[0_0_0_3px_rgba(51,182,255,0.24),0_16px_35px_rgba(0,0,0,0.28)] sm:h-36 sm:w-36">
            <div className="h-full w-full overflow-hidden rounded-full bg-[#0A1B4D]">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-4xl font-black text-white sm:text-5xl">
                  {initials}
                </div>
              )}
            </div>
          </div>
          <span
            className="absolute bottom-2 right-1 h-6 w-6 rounded-full border-[3px] border-[#0A1B4D] bg-emerald-400 sm:h-7 sm:w-7"
            aria-hidden
          />
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="text-[1.8rem] font-black leading-[1.02] tracking-tight text-white sm:text-[2.25rem]">
            {name}
          </h1>

          <div className="mt-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#174DC9] px-3 py-1.5 text-[12px] font-black text-white shadow-sm ring-1 ring-white/10">
              <BadgeCheck className="h-4 w-4 text-[#62C7FF]" aria-hidden />
              {roleLabel}
            </span>
          </div>

          {location ? (
            <p className="mt-3 flex min-w-0 items-center gap-1.5 text-[13px] font-semibold text-white/85 sm:text-sm">
              <MapPin className="h-4 w-4 shrink-0 text-white" aria-hidden />
              <span className="truncate">{location}</span>
            </p>
          ) : null}
        </div>
      </div>

      <div className="relative mx-auto mt-5 flex w-full max-w-3xl flex-wrap items-center gap-2 px-5 pb-7 sm:px-8 sm:pb-9">
        {!loading && levelName ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F5C542]/18 px-2.5 py-1.5 text-[12px] font-black text-[#FDE68A] ring-1 ring-[#FBBF24]/35">
            {medalSrc ? (
              <img src={medalSrc} alt="" className="h-4 w-4 object-contain" loading="lazy" />
            ) : null}
            {levelName}
          </span>
        ) : null}

        {hasRating ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1.5 text-[12px] font-black text-white ring-1 ring-white/15">
            <Star className="h-3.5 w-3.5 fill-[#FBBF24] text-[#FBBF24]" aria-hidden />
            {rating!.toFixed(1).replace('.', ',')}
            {reviewCount > 0 ? (
              <span className="font-semibold text-white/70">({reviewsCountLabel(reviewCount)})</span>
            ) : null}
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-1.5 text-[11px] font-bold text-white/55 ring-1 ring-white/10">
            {noReviewsLabel}
          </span>
        )}
      </div>
    </section>
  );
}
