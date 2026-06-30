import * as Icons from 'lucide-react';
import type { Job } from '@/types/job';
import { formatJobBudgetDisplay } from '@/utils/formatJobBudget';
import { formatJobScheduleDisplay, formatJobOpenedAt } from '@/utils/jobDisplay';
import { translateJobTitle } from '@/utils/translateCategory';
import { StarRatingDisplay } from '@/components/reviews/StarRatingInput';
import { LinkHelpRankBadgeFromStats } from '@/components/ranking/LinkHelpRankBadge';
import { HelperCreditCostBlock } from '@/components/helpers/HelperCreditCostBlock';
import { isRemoteJob } from '@/utils/calculateHelperLeadCreditCost';
import type { AppLanguage } from '@/services/translationService';
import { getRequestDescriptionForViewer } from '@/utils/requestDescriptionDisplay';

function localeToLanguage(locale: string): AppLanguage {
  if (locale.startsWith('fr')) return 'fr';
  if (locale.startsWith('en')) return 'en';
  return 'pt';
}

type Props = {
  job: Job | null;
  open: boolean;
  onClose: () => void;
  onApply?: (job: Job) => void;
  hasApplied?: boolean;
  isApplying?: boolean;
  clientReviewCount?: number;
  clientCompletedOrders?: number;
  t: (key: string, vars?: Record<string, string | number>) => string;
  translateCategory: (raw: string, tf: (k: string) => string) => string;
  formatJobSchedule: (job: Job, tf: (k: string, vars?: Record<string, string | number>) => string) => string;
  distanceKm?: number | null;
  distanceFromBase?: boolean;
  needsBaseAddress?: boolean;
  baseAddressPendingCoords?: boolean;
  locale?: string;
};

export function HelperOpportunityDetailModal({
  job,
  open,
  onClose,
  onApply,
  hasApplied = false,
  isApplying = false,
  clientReviewCount = 0,
  clientCompletedOrders = 0,
  t,
  translateCategory,
  formatJobSchedule,
  distanceKm,
  distanceFromBase = false,
  needsBaseAddress = false,
  baseAddressPendingCoords = false,
  locale = 'pt-BR',
}: Props) {
  if (!open || !job) return null;

  const category = translateCategory(job.category, t);
  const title = translateJobTitle(job.title, job.category, job.subcategory, t);
  const budget = formatJobBudgetDisplay(job, t);
  const openedLabel = formatJobOpenedAt(job.createdAt, t);
  const loc = isRemoteJob(job)
    ? t('jobs.remote')
    : needsBaseAddress
      ? t('helper_dashboard.base_address_missing_short')
      : baseAddressPendingCoords
        ? t('helper_dashboard.base_address_saved_pending_coords')
        : distanceKm != null
          ? distanceFromBase
            ? t('helper_dashboard.distance_from_base_km', { km: distanceKm.toFixed(1) })
            : t('helper_dashboard.distance_km', { km: distanceKm.toFixed(1) })
          : job.location?.trim() || t('jobs.remote');
  const schedule = formatJobSchedule(job, t);
  const requestDescription = getRequestDescriptionForViewer(job.description, localeToLanguage(locale));

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/55 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-sm sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0"
        aria-label={t('common.close')}
        onClick={onClose}
      />
      <section
        className="relative z-10 flex w-full max-w-lg max-h-[85dvh] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 text-sm font-bold text-slate-600 hover:text-slate-900"
          >
            <Icons.ChevronLeft className="h-4 w-4" />
            {t('nav.back')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"
            aria-label={t('common.close')}
          >
            <Icons.X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-2">
          <p className="text-[10px] font-black uppercase tracking-wide text-blue-600">{category}</p>
          <h2 className="mt-1 text-xl font-black leading-snug text-slate-950">{title}</h2>

          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
            <img
              src={job.clientAvatar}
              alt=""
              className="h-14 w-14 shrink-0 rounded-2xl border-2 border-white object-cover shadow-sm"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-slate-950">{job.clientName}</p>
              {job.clientRating != null && job.clientRating > 0 ? (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <StarRatingDisplay rating={job.clientRating} />
                  <span className="text-[11px] font-bold text-slate-600">
                    {t('helper_dashboard.client_rating_label', {
                      rating: job.clientRating.toFixed(1),
                      count: clientReviewCount,
                    })}
                  </span>
                </div>
              ) : (
                <p className="mt-0.5 text-xs font-medium text-slate-500">{t('service_review.no_rating_yet')}</p>
              )}
              <div className="mt-2">
                <LinkHelpRankBadgeFromStats
                  role="client"
                  completedCount={clientCompletedOrders}
                  averageRating={job.clientRating ?? 0}
                  requireCompleted
                  size="sm"
                  showLabel
                  t={t}
                />
              </div>
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-1.5 text-[10px] font-black uppercase tracking-wide text-slate-400">
              {t('helper_dashboard.detail_observations')}
            </p>
            <p className="whitespace-pre-wrap rounded-2xl border border-slate-100 bg-white px-3 py-3 text-sm font-medium leading-relaxed text-slate-700">
              {requestDescription.display || '—'}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-[10px] font-bold uppercase text-slate-400">{t('jobs.budget_label')}</p>
              <p className="mt-1 text-sm font-black text-emerald-800">{budget}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-[10px] font-bold uppercase text-slate-400">{t('jobs.location_label')}</p>
              <p className="mt-1 line-clamp-2 text-sm font-bold text-slate-900">{loc}</p>
            </div>
          </div>

          {openedLabel ? (
            <p className="mt-3 text-xs font-semibold text-slate-500">{openedLabel}</p>
          ) : null}

          {schedule ? (
            <p className="mt-3 flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700">
              <Icons.Clock className="h-4 w-4 shrink-0 text-blue-500" />
              {t('jobs.client_desired_schedule', { schedule })}
            </p>
          ) : null}

          <div className="mt-4">
            <HelperCreditCostBlock job={job} t={t} distanceKm={distanceKm} variant="detail" showHireEstimate />
          </div>

          {job.address || job.city ? (
            <p className="mt-2 flex items-start gap-2 text-xs font-medium text-slate-600">
              <Icons.MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{[job.address, job.city, job.region].filter(Boolean).join(', ')}</span>
            </p>
          ) : null}
        </div>

        {onApply ? (
          <footer className="shrink-0 border-t border-slate-100 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {hasApplied ? (
              <p className="flex min-h-[48px] items-center justify-center gap-2 text-sm font-bold text-emerald-700">
                <Icons.CheckCircle2 className="h-5 w-5" />
                {t('helper_dashboard.applied_sent')}
              </p>
            ) : (
              <button
                type="button"
                disabled={isApplying}
                onClick={() => onApply(job)}
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {isApplying ? (
                  <Icons.Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Icons.Check className="h-5 w-5" />
                )}
                {t('helper_dashboard.apply_now')}
              </button>
            )}
          </footer>
        ) : null}
      </section>
    </div>
  );
}
