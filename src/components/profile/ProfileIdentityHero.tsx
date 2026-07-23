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
    <section className="relative overflow-hidden rounded-[1.85rem] bg-[#0A1B4D] px-4 pb-4 pt-3.5 text-white shadow-[0_20px_48px_rgba(8,24,72,0.28)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(56,140,255,0.55),transparent_42%),linear-gradient(145deg,#1554E0_0%,#0B2A78_45%,#07153F_100%)]" />
      <div className="pointer-events-none absolute -right-10 top-8 h-36 w-36 rounded-full bg-[#33B6FF]/15 blur-2xl" />

      <div className="relative flex justify-end">
        <button
          type="button"
          onClick={onViewPublic}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white/85 transition hover:text-white"
        >
          {viewPublicLabel}
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>

      <div className="relative mt-2 flex items-center gap-3.5">
        <div className="relative shrink-0">
          <div className="h-[4.75rem] w-[4.75rem] overflow-hidden rounded-full bg-gradient-to-br from-[#2F7BFF] to-[#0B4ED8] p-[3px] shadow-[0_0_0_3px_rgba(51,182,255,0.45)] sm:h-20 sm:w-20">
            <div className="h-full w-full overflow-hidden rounded-full bg-[#0A1B4D]">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl font-black text-white">
                  {initials}
                </div>
              )}
            </div>
          </div>
          <span
            className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-[#0A1B4D] bg-emerald-400"
            aria-hidden
          />
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[1.55rem] font-black leading-none tracking-tight text-white sm:text-[1.75rem]">
            {name}
          </h1>

          <div className="mt-2.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#2563FF] px-2.5 py-1 text-[11px] font-black text-white shadow-sm">
              <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
              {roleLabel}
            </span>
          </div>

          {location ? (
            <p className="mt-2 flex min-w-0 items-center gap-1 text-[12px] font-semibold text-white/80">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-[#7DD3FC]" aria-hidden />
              <span className="truncate">{location}</span>
            </p>
          ) : null}
        </div>
      </div>

      <div className="relative mt-4 flex flex-wrap items-center gap-2">
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
