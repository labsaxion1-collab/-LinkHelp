import { ExternalLink, MapPin, Pencil, Star } from 'lucide-react';
import { MEDAL_MAP } from '@/gamification/config/gamificationMedals';
import type { UserType } from '@/gamification/types/gamification';
import { formatProfileLocation, profileInitials } from '@/components/profile/profileDisplay';
import { ProfileSectionHeader } from '@/components/profile/ProfileSectionHeader';

export type PublicPreviewIndicator = {
  key: string;
  label: string;
  active: boolean;
};

type Props = {
  title: string;
  subtitle: string;
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
  roleLabel: string;
  levelName?: string | null;
  heroKey?: string | null;
  userType: UserType;
  city?: string | null;
  region?: string | null;
  rating?: number | null;
  reviewCount?: number;
  noReviewsLabel: string;
  reviewsCountLabel: (count: number) => string;
  indicators: PublicPreviewIndicator[];
  editLabel: string;
  viewLabel: string;
  onEdit: () => void;
  onView: () => void;
};

export function PublicProfilePreviewCard({
  title,
  subtitle,
  name,
  email,
  avatarUrl,
  roleLabel,
  levelName,
  heroKey,
  userType,
  city,
  region,
  rating,
  reviewCount = 0,
  noReviewsLabel,
  reviewsCountLabel,
  indicators,
  editLabel,
  viewLabel,
  onEdit,
  onView,
}: Props) {
  const location = formatProfileLocation(city, region);
  const initials = profileInitials(name, email);
  const medalSrc = heroKey
    ? MEDAL_MAP[heroKey] ?? MEDAL_MAP[`${userType}_novo`]
    : MEDAL_MAP[`${userType}_novo`];
  const hasRating = rating != null && rating > 0 && reviewCount > 0;
  const visibleIndicators = indicators.filter((item) => item.active);

  return (
    <section>
      <ProfileSectionHeader
        title={title}
        action={
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            {editLabel}
          </button>
        }
      />
      <p className="-mt-1 mb-3 text-sm font-medium text-slate-500">{subtitle}</p>

      <div className="overflow-hidden rounded-[1.5rem] border border-slate-200/90 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.06)]">
        <div className="relative bg-gradient-to-br from-[#071A3D] via-[#0B2A66] to-[#123F9A] px-4 py-5 text-white">
          <div className="pointer-events-none absolute -right-6 top-2 h-28 w-28 rounded-full border border-white/10 opacity-40" />
          <div className="relative flex items-center gap-3.5">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-white/10 ring-2 ring-[#33B6FF]/50">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xl font-black">
                  {initials}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-black">{name}</p>
              <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs font-semibold text-white/75">
                <span className="truncate">
                  {roleLabel}
                  {levelName ? ` • ${levelName}` : ''}
                </span>
                {medalSrc ? (
                  <img src={medalSrc} alt="" className="h-4 w-4 shrink-0 object-contain" loading="lazy" />
                ) : null}
              </p>
              {location ? (
                <p className="mt-1 flex min-w-0 items-center gap-1 text-xs font-medium text-white/65">
                  <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{location}</span>
                </p>
              ) : null}
              {hasRating ? (
                <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-amber-200">
                  <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" aria-hidden />
                  {rating!.toFixed(1)} ({reviewsCountLabel(reviewCount)})
                </p>
              ) : (
                <p className="mt-1.5 text-xs font-medium text-white/50">{noReviewsLabel}</p>
              )}
            </div>
          </div>
        </div>

        {visibleIndicators.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 border-t border-slate-100 bg-slate-50/70 p-3">
            {visibleIndicators.map((item) => (
              <div
                key={item.key}
                className="rounded-xl border border-slate-200/80 bg-white px-2.5 py-2 text-[11px] font-bold text-slate-700"
              >
                {item.label}
              </div>
            ))}
          </div>
        ) : null}

        <div className="p-3">
          <button
            type="button"
            onClick={onView}
            className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl bg-[#2563FF] px-4 text-sm font-black text-white shadow-[0_10px_24px_rgba(37,99,255,0.25)] transition hover:bg-[#1D4ED8]"
          >
            {viewLabel}
            <ExternalLink className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </section>
  );
}
