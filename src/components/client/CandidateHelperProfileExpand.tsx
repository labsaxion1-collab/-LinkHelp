import { useMemo, useState } from 'react';
import { Check, Star } from 'lucide-react';
import { clsx } from 'clsx';
import { useLanguage } from '@/context/LanguageContext';
import { useAppData } from '@/context/AppDataContext';
import { usePublicReputationDossier } from '@/hooks/usePublicReputationDossier';
import { useHelperSpokenLanguages } from '@/hooks/useHelperSpokenLanguages';
import { getCategoryIconById } from '@/utils/categoryIcons';
import { getSpokenLanguageLabel } from '@/data/spokenLanguages';
import { translateCategory } from '@/utils/translateCategory';
import {
  buildHelperCategoryExperience,
  CANDIDATE_HELPER_CRITERIA,
  formatMemberDuration,
} from '@/utils/candidateProfileExpand';

const INITIAL_REVIEW_COUNT = 2;

type Props = {
  helperId: string;
  helperRating?: number | null;
  helperJobs?: number | null;
  className?: string;
};

function formatReviewDate(ts: number, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(
      new Date(ts),
    );
  } catch {
    return '';
  }
}

export function CandidateHelperProfileExpand({
  helperId,
  helperRating,
  helperJobs,
  className,
}: Props) {
  const { t, language } = useLanguage();
  const { applications, jobs } = useAppData();
  const [showAllReviews, setShowAllReviews] = useState(false);

  const dossier = usePublicReputationDossier({
    userId: helperId,
    role: 'helper',
    averageRating: helperRating,
    completedCount: helperJobs,
  });

  const { languages } = useHelperSpokenLanguages(helperId, true);

  const categoryExperience = useMemo(
    () => buildHelperCategoryExperience(helperId, applications, jobs),
    [helperId, applications, jobs],
  );

  const memberLabel = formatMemberDuration(dossier.memberSince, t);
  const visibleReviews = showAllReviews
    ? dossier.recentReviews
    : dossier.recentReviews.slice(0, INITIAL_REVIEW_COUNT);
  const hasMoreReviews = dossier.recentReviews.length > INITIAL_REVIEW_COUNT;

  const criteriaPairs = useMemo(() => {
    const items = CANDIDATE_HELPER_CRITERIA.map((criterion) => {
      const avg = dossier.criteriaAverages[criterion.key];
      if (avg == null) return null;
      return { ...criterion, avg };
    }).filter(Boolean) as Array<(typeof CANDIDATE_HELPER_CRITERIA)[number] & { avg: number }>;

    const pairs: Array<typeof items> = [];
    for (let i = 0; i < items.length; i += 2) {
      pairs.push(items.slice(i, i + 2));
    }
    return pairs;
  }, [dossier.criteriaAverages]);

  const languageLabels = languages.map((code) => getSpokenLanguageLabel(code, t));

  return (
    <div
      className={clsx(
        'overflow-hidden border-t border-slate-200/80 bg-gradient-to-b from-slate-50/90 to-white px-3 py-3',
        className,
      )}
    >
      <ul className="space-y-1.5 text-[12px] font-semibold text-slate-700">
        <li className="flex items-center gap-2">
          <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
          <span>
            {t('candidate_profile.completed_services', { count: dossier.completedCount })}
          </span>
        </li>
        <li className="flex items-center gap-2">
          <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
          <span>{t('candidate_profile.total_reviews', { count: dossier.reviewCount })}</span>
        </li>
        <li className="flex items-center gap-2">
          <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
          <span>
            {languageLabels.length
              ? t('candidate_profile.languages_spoken', { languages: languageLabels.join(', ') })
              : t('candidate_profile.languages_unknown')}
          </span>
        </li>
        {memberLabel ? (
          <li className="flex items-center gap-2">
            <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
            <span>{memberLabel}</span>
          </li>
        ) : null}
      </ul>

      {categoryExperience.length > 0 ? (
        <div className="mt-3">
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
            {t('candidate_profile.experience_by_category')}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {categoryExperience.map(({ categoryId, count }) => {
              const Icon = getCategoryIconById(categoryId);
              const categoryLabel = translateCategory(categoryId, t);
              return (
                <div
                  key={categoryId}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-2.5 py-1.5 shadow-sm"
                  title={categoryLabel}
                  aria-label={t('candidate_profile.category_jobs_a11y', {
                    category: categoryLabel,
                    count,
                  })}
                >
                  <Icon className="h-4 w-4 shrink-0 text-slate-700" strokeWidth={2} aria-hidden />
                  <span className="text-sm font-black tabular-nums text-slate-900">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {criteriaPairs.length > 0 ? (
        <div className="mt-3 rounded-xl border border-slate-100 bg-white/90 px-2.5 py-2">
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
            {t('candidate_profile.performance_title')}
          </p>
          <div className="mt-1.5 space-y-1">
            {criteriaPairs.map((pair, rowIndex) => (
              <p
                key={`criteria-row-${rowIndex}`}
                className="text-[11px] font-bold leading-snug text-slate-700"
              >
                {pair
                  .map((item) => `${t(item.labelKey)} ${item.avg.toFixed(1)}/5`)
                  .join(' | ')}
              </p>
            ))}
          </div>
        </div>
      ) : null}

      {dossier.recentReviews.length > 0 ? (
        <div className="mt-3">
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
            {t('candidate_profile.latest_reviews')}
          </p>
          <ul className="mt-1.5 space-y-1.5">
            {visibleReviews.map((review, index) => (
              <li
                key={`${review.createdAt}-${index}`}
                className="rounded-lg border border-slate-100 bg-white px-2.5 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 text-amber-600">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden />
                    <span className="text-xs font-black tabular-nums">{review.rating.toFixed(1)}</span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {formatReviewDate(review.createdAt, language)}
                  </span>
                </div>
                {review.comment ? (
                  <p className="mt-0.5 line-clamp-3 text-[11px] font-medium leading-relaxed text-slate-600">
                    {review.comment}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
          {hasMoreReviews && !showAllReviews ? (
            <button
              type="button"
              onClick={() => setShowAllReviews(true)}
              className="mt-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-700"
            >
              {t('candidate_profile.show_more_reviews')}
            </button>
          ) : null}
        </div>
      ) : null}

      {dossier.loading ? (
        <p className="mt-2 text-center text-[10px] font-semibold text-slate-400">{t('common.loading')}</p>
      ) : null}
    </div>
  );
}
