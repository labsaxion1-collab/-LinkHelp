import type { ReactNode } from 'react';
import { Star, Calendar, BarChart3, MessageSquareText } from 'lucide-react';
import { clsx } from 'clsx';
import { useLanguage } from '@/context/LanguageContext';
import { LinkHelpRankBadge } from '@/components/ranking/LinkHelpRankBadge';
import { RatingScoreBar } from '@/components/reputation/RatingScoreBar';
import { TrustScoreBar } from '@/components/reputation/TrustScoreBar';
import { usePublicReputationDossier } from '@/hooks/usePublicReputationDossier';
import { criteriaConfigForTargetRole } from '@/utils/reputationDossier';
import type { ClientRankDef, HelperRankDef } from '@/utils/linkHelpRanking';

type Props = {
  userId: string;
  role: 'client' | 'helper';
  displayName: string;
  avatar?: string;
  subtitle?: string | null;
  averageRating?: number | null;
  completedCount?: number | null;
  publishedCount?: number | null;
  className?: string;
};

function formatMemberSince(ts: number | null, locale: string): string | null {
  if (!ts) return null;
  try {
    return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(new Date(ts));
  } catch {
    return null;
  }
}

function formatReviewDate(ts: number, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(
      new Date(ts),
    );
  } catch {
    return '';
  }
}

export function ReputationDossierPanel({
  userId,
  role,
  displayName,
  avatar,
  subtitle,
  averageRating,
  completedCount,
  publishedCount,
  className,
}: Props) {
  const { t, language } = useLanguage();
  const dossier = usePublicReputationDossier({
    userId,
    role,
    averageRating,
    completedCount,
    publishedCount,
  });

  const criteria = criteriaConfigForTargetRole(role);
  const memberLabel = formatMemberSince(dossier.memberSince, language);
  const hasReviews = dossier.reviewCount > 0 || dossier.averageRating > 0;
  const hasCriteria = Object.keys(dossier.criteriaAverages).length > 0;
  const showRank = dossier.rank != null && (dossier.completedCount > 0 || dossier.reviewCount > 0);

  return (
    <div className={clsx('space-y-3', className)}>
      <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50 to-blue-50/40 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          {avatar ? (
            <img src={avatar} alt="" className="h-14 w-14 rounded-2xl border border-white object-cover shadow-md" />
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-black text-slate-950">{displayName}</p>
            {subtitle ? <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">{subtitle}</p> : null}
            {showRank && dossier.rank ? (
              <div className="mt-2">
                <LinkHelpRankBadge
                  rank={dossier.rank as HelperRankDef | ClientRankDef}
                  role={role}
                  size="sm"
                  showLabel
                  t={t}
                />
              </div>
            ) : null}
          </div>
          {dossier.trustScore > 0 ? (
            <div className="shrink-0 rounded-xl bg-white/90 px-2.5 py-2 text-center ring-1 ring-slate-200/80">
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                {t('reputation_dossier.score')}
              </p>
              <p className="text-sm font-black tabular-nums text-blue-700">
                {t('reputation_dossier.score_of_max', { score: dossier.trustScore })}
              </p>
              <TrustScoreBar score={dossier.trustScore} className="mt-1.5" heightClass="h-1" />
            </div>
          ) : null}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatPill
            label={t('reputation_dossier.avg_rating')}
            value={dossier.averageRating > 0 ? dossier.averageRating.toFixed(1) : '—'}
            icon={<Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
          />
          <StatPill
            label={
              role === 'helper'
                ? t('reputation_dossier.services_completed')
                : t('reputation_dossier.orders_completed')
            }
            value={String(dossier.completedCount)}
            icon={<BarChart3 className="h-3.5 w-3.5 text-blue-600" />}
          />
          {role === 'client' && dossier.publishedCount != null ? (
            <StatPill
              label={t('reputation_dossier.orders_published')}
              value={String(dossier.publishedCount)}
              icon={<BarChart3 className="h-3.5 w-3.5 text-violet-600" />}
            />
          ) : null}
          <StatPill
            label={t('reputation_dossier.reviews_received')}
            value={String(dossier.reviewCount)}
            icon={<MessageSquareText className="h-3.5 w-3.5 text-emerald-600" />}
          />
        </div>

        {dossier.averageRating > 0 ? (
          <div className="mt-2.5 rounded-xl border border-slate-100 bg-white/70 px-2.5 py-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 text-amber-600">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="text-xs font-black tabular-nums text-slate-900">
                  {t('reputation_dossier.avg_rating_of_max', { rating: dossier.averageRating.toFixed(1) })}
                </span>
              </div>
            </div>
            <RatingScoreBar score={dossier.averageRating} className="mt-1.5" heightClass="h-1" />
          </div>
        ) : null}

        {memberLabel ? (
          <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <Calendar className="h-3.5 w-3.5" />
            {t('reputation_dossier.member_since', { date: memberLabel })}
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-4">
        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
          {t('reputation_dossier.criteria_title')}
        </p>
        {hasCriteria ? (
          <div className="mt-2 space-y-1.5">
            {criteria.map((criterion) => {
              const avg = dossier.criteriaAverages[criterion.key];
              if (avg == null) return null;
              return (
                <div key={criterion.key} className="rounded-lg bg-slate-50 px-2.5 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-xs font-bold text-slate-700">
                      {t(criterion.labelKey)}
                    </span>
                    <span className="shrink-0 text-[11px] font-black tabular-nums text-slate-800">
                      {avg.toFixed(1)}
                    </span>
                  </div>
                  <RatingScoreBar score={avg} className="mt-1" heightClass="h-1" />
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-2 text-sm font-medium text-slate-500">{t('reputation_dossier.empty_reviews')}</p>
        )}
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-4">
        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
          {t('reputation_dossier.recent_reviews_title')}
        </p>
        {dossier.recentReviews.length > 0 ? (
          <ul className="mt-2 space-y-2">
            {dossier.recentReviews.map((review, index) => (
              <li key={`${review.createdAt}-${index}`} className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 text-amber-600">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-black tabular-nums">{review.rating.toFixed(1)}</span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {formatReviewDate(review.createdAt, language)}
                  </span>
                </div>
                {review.comment ? (
                  <p className="mt-1 text-xs font-medium leading-relaxed text-slate-600">{review.comment}</p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : hasReviews ? null : (
          <p className="mt-2 text-sm font-medium text-slate-500">{t('reputation_dossier.empty_reviews')}</p>
        )}
      </div>

      {dossier.loading ? (
        <p className="text-center text-[11px] font-semibold text-slate-400">{t('common.loading')}</p>
      ) : null}
    </div>
  );
}

function StatPill({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white/80 px-2.5 py-2">
      <div className="flex items-center gap-1 text-slate-500">{icon}</div>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm font-black tabular-nums text-slate-900">{value}</p>
    </div>
  );
}
