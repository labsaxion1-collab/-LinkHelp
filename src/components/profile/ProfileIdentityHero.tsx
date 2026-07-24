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
  name, email, avatarUrl, roleLabel, userType, city, region, rating, reviewCount = 0,
  onViewPublic, viewPublicLabel, noReviewsLabel, reviewsCountLabel,
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
    <section className="relative isolate w-full overflow-hidden bg-[#07194B] text-white shadow-[0_18px_44px_rgba(7,25,75,0.16)]">
      <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_8%_-15%,rgba(36,119,255,0.78),transparent_38%),radial-gradient(circle_at_86%_100%,rgba(24,86,219,0.42),transparent_42%),linear-gradient(112deg,#0B318F_0%,#081F61_49%,#050F32_100%)]" />
      <svg className="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-50" viewBox="0 0 1440 360" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id="profile-hero-line-a" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#2AA7FF" stopOpacity="0" />
            <stop offset=".46" stopColor="#2AA7FF" stopOpacity=".36" />
            <stop offset="1" stopColor="#2AA7FF" stopOpacity=".04" />
          </linearGradient>
          <linearGradient id="profile-hero-line-b" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
            <stop offset=".62" stopColor="#64C8FF" stopOpacity=".2" />
            <stop offset="1" stopColor="#64C8FF" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M-90 302 C 230 178, 418 384, 765 238 S 1206 98, 1535 186" fill="none" stroke="url(#profile-hero-line-a)" strokeWidth="2" />
        <path d="M210 -52 C 412 20, 401 222, 716 254 S 1100 215, 1488 8" fill="none" stroke="url(#profile-hero-line-b)" strokeWidth="1.5" />
      </svg>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-[#F4F7FC]/[0.07]" />

      <div className="relative mx-auto grid w-full max-w-6xl grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3 px-4 pb-8 pt-6 sm:gap-x-6 sm:px-7 sm:pb-9 sm:pt-8 md:grid-cols-[auto_minmax(0,1fr)_auto] lg:px-8 lg:pb-10 lg:pt-16">
        <div className="relative shrink-0">
          <div className="h-[5.5rem] w-[5.5rem] overflow-hidden rounded-full bg-gradient-to-br from-[#58C8FF] via-[#187CFF] to-[#0B4ED8] p-[3px] shadow-[0_0_0_3px_rgba(51,182,255,0.16),0_14px_32px_rgba(0,0,0,0.24)] min-[390px]:h-24 min-[390px]:w-24 sm:h-28 sm:w-28 lg:h-32 lg:w-32">
            <div className="h-full w-full overflow-hidden rounded-full bg-[#0A1B4D]">
              {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : (
                <div className="flex h-full w-full items-center justify-center text-3xl font-black text-white sm:text-4xl">{initials}</div>
              )}
            </div>
          </div>
          <span className="absolute bottom-1.5 right-0.5 h-5 w-5 rounded-full border-[3px] border-[#0A1B4D] bg-emerald-400 sm:h-6 sm:w-6" aria-hidden />
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="break-words text-[1.55rem] font-black leading-[1.05] tracking-tight text-white min-[390px]:text-[1.7rem] sm:text-[2rem] lg:text-[2.25rem]">{name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#174DC9] px-3 py-1.5 text-[12px] font-black text-white shadow-sm ring-1 ring-white/10">
              <BadgeCheck className="h-4 w-4 text-[#62C7FF]" aria-hidden />{roleLabel}
            </span>
            {!loading && levelName ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F5C542]/15 px-2.5 py-1.5 text-[12px] font-black text-[#FDE68A] ring-1 ring-[#FBBF24]/30">
                {medalSrc ? <img src={medalSrc} alt="" className="h-4 w-4 object-contain" loading="lazy" /> : null}{levelName}
              </span>
            ) : null}
          </div>
          {location ? (
            <p className="mt-2.5 flex min-w-0 items-start gap-1.5 text-[12px] font-semibold leading-5 text-white/80 sm:text-sm">
              <MapPin className="h-4 w-4 shrink-0 text-white" aria-hidden /><span className="break-words">{location}</span>
            </p>
          ) : null}
        </div>

        <div className="col-span-2 flex min-w-0 flex-wrap items-center gap-2 md:col-span-1 md:col-start-3 md:row-start-1 md:max-w-[15rem] md:flex-col md:items-end">
          {hasRating ? (
            <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-[12px] font-black text-white ring-1 ring-white/15">
              <Star className="h-3.5 w-3.5 shrink-0 fill-[#FBBF24] text-[#FBBF24]" aria-hidden />
              {rating!.toFixed(1).replace('.', ',')}
              {reviewCount > 0 ? <span className="truncate font-semibold text-white/70">({reviewsCountLabel(reviewCount)})</span> : null}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-2 text-[11px] font-bold text-white/65 ring-1 ring-white/10">{noReviewsLabel}</span>
          )}
          <button type="button" onClick={onViewPublic} className="inline-flex min-h-[40px] max-w-full items-center gap-2 rounded-full border border-white/20 bg-white/[0.07] px-3.5 text-[11px] font-bold text-white transition hover:bg-white/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:text-[12px]">
            <span className="truncate">{viewPublicLabel}</span><ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
          </button>
        </div>
      </div>
    </section>
  );
}
