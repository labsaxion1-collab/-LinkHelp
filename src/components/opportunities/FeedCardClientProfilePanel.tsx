import { Languages, MapPin, Star, UserRound } from 'lucide-react';
import type { Job } from '@/types/job';
import { useLanguage } from '@/context/LanguageContext';
import { getSpokenLanguageLabel } from '@/data/spokenLanguages';
import { getLevelsFor } from '@/gamification/engines/levelEngine';
import { usePublicGamificationProfiles } from '@/gamification/hooks/usePublicGamificationProfile';
import { usePublicReputationDossier } from '@/hooks/usePublicReputationDossier';
import { usePublicProfileExtras } from '@/hooks/usePublicProfileExtras';

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
    <div className="space-y-3" data-testid="feed-card-profile-content">
      <div className="flex items-center gap-2.5">
        {avatarOk ? (
          <img
            src={job.clientAvatar}
            alt=""
            className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-slate-100"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-black text-slate-500">
            {clientInitials(job.clientName)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-black text-[#0F172A]">{job.clientName}</p>
          <p className="mt-0.5 text-[11px] font-semibold text-[#64748B]">
            {t('profile_page.public_level')}: {levelName}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-2.5 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#94A3B8]">
            {t('reputation_dossier.score')}
          </p>
          <p className="mt-0.5 text-[13px] font-black tabular-nums text-[#0F172A]">
            {dossier.trustScore}
          </p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-2.5 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#94A3B8]">
            {t('profile_page.overall_rating')}
          </p>
          {hasRating ? (
            <p className="mt-0.5 flex items-center gap-1 text-[13px] font-black text-[#0F172A]">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
              {ratingValue.toFixed(1)}
              <span className="text-[10px] font-semibold text-[#94A3B8]">
                ({dossier.reviewCount})
              </span>
            </p>
          ) : (
            <p className="mt-0.5 text-[11px] font-semibold text-[#94A3B8]">
              {t('profile_page.no_reviews_yet')}
            </p>
          )}
        </div>
      </div>

      {dossier.completedCount > 0 ? (
        <p className="text-[12px] font-semibold text-[#475569]">
          {t('profile_page.public_orders_completed_count', { count: dossier.completedCount })}
        </p>
      ) : null}

      {location ? (
        <p className="flex min-w-0 items-center gap-1.5 text-[12px] font-semibold text-[#64748B]">
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate">{location}</span>
        </p>
      ) : null}

      {bio ? (
        <section>
          <h4 className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-[#94A3B8]">
            <UserRound className="h-3.5 w-3.5" aria-hidden />
            {t('profile_page.public_about')}
          </h4>
          <p className="mt-1 text-[12px] font-medium leading-relaxed text-[#475569]">{bio}</p>
        </section>
      ) : null}

      {languageLabels.length > 0 ? (
        <section>
          <h4 className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-[#94A3B8]">
            <Languages className="h-3.5 w-3.5" aria-hidden />
            {t('profile_page.spoken_languages')}
          </h4>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {languageLabels.map((label) => (
              <span
                key={label}
                className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700"
              >
                {label}
              </span>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
