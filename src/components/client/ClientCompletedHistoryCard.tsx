import * as Icons from 'lucide-react';
import type { Application } from '@/types/application';
import type { Job } from '@/types/job';
import type { UpcomingJob } from '@/types/upcoming';
import { LinkHelpRankBadgeFromStats } from '@/components/ranking/LinkHelpRankBadge';
import { getCategoryFeedTheme } from '@/utils/categoryFeedTheme';
import { getCategoryIconById } from '@/utils/categoryIcons';
import { formatJobBudgetAmount } from '@/utils/formatJobBudget';
import { formatJobScheduleDisplay } from '@/utils/jobDisplay';
import {
  translateCategory,
  translateJobTitle,
  translateServiceSubcategory,
} from '@/utils/translateCategory';
import {
  resolveCompletedReviewUiState,
  resolveCompletionTimestamp,
  type CompletedReviewUiState,
} from '@/utils/completedServiceHistory';
import type { ServiceReview } from '@/types/review';

type Props = {
  job: Job;
  hiredApplication: Application | undefined;
  upcoming: UpcomingJob | undefined;
  reviews: ServiceReview[];
  reviewerId: string;
  pendingRequestIds: ReadonlySet<string>;
  t: (key: string, vars?: Record<string, string | number>) => string;
  formatMoneyAmount: (amount: number, currency: string) => string;
  locale: string;
  onOpenHelperProfile: (app: Application) => void;
  onOpenDetails: () => void;
  onRate: () => void;
};

function formatHistoryDate(ts: number, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(ts));
  } catch {
    return new Date(ts).toLocaleString();
  }
}

function ReviewStateBlock({
  state,
  myRating,
  t,
  onRate,
}: {
  state: CompletedReviewUiState;
  myRating: number | null;
  t: (key: string) => string;
  onRate: () => void;
}) {
  if (state === 'submitted') {
    return (
      <div
        data-testid="completed-review-submitted"
        className="inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-900"
      >
        <Icons.CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>{t('service_review.review_submitted')}</span>
        {myRating != null ? (
          <span className="inline-flex items-center gap-0.5 text-emerald-800">
            <Icons.Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
            {myRating.toFixed(1)}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <p
        data-testid="completed-review-pending-hint"
        className="text-center text-[11px] font-semibold text-amber-800"
      >
        {t('service_review.review_pending')}
      </p>
      <button
        type="button"
        data-testid="completed-review-rate"
        onClick={onRate}
        className="inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 text-xs font-bold text-amber-950 hover:bg-amber-100"
      >
        <Icons.Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
        {t('service_review.rate_action')}
      </button>
    </div>
  );
}

export function ClientCompletedHistoryCard({
  job,
  hiredApplication,
  upcoming,
  reviews,
  reviewerId,
  pendingRequestIds,
  t,
  formatMoneyAmount,
  locale,
  onOpenHelperProfile,
  onOpenDetails,
  onRate,
}: Props) {
  const theme = getCategoryFeedTheme(job.category);
  const CategoryIcon = getCategoryIconById(job.category);
  const title = translateJobTitle(job.title, job.category, job.subcategory, t);
  const subcategoryLabel = job.subcategory
    ? translateServiceSubcategory(job.category, job.subcategory, t)
    : null;
  const schedule = formatJobScheduleDisplay(job, t);
  const budgetAmount = formatJobBudgetAmount(job, t);
  const agreed =
    hiredApplication?.proposedAmount ?? job.acceptedAmount ?? null;
  const agreedLabel =
    agreed != null
      ? formatMoneyAmount(agreed, job.currency || 'CAD')
      : budgetAmount;
  const modality =
    job.serviceMode === 'remote'
      ? t('create_modal.service_mode_remote')
      : job.serviceMode === 'in_person'
        ? t('create_modal.service_mode_in_person')
        : t('common.unknown');
  const locationLabel =
    job.serviceMode === 'remote'
      ? null
      : job.address || job.city || job.location || null;

  const myReview = reviews.find((r) => r.requestId === job.id && r.reviewerId === reviewerId);
  const completionTs = resolveCompletionTimestamp(upcoming, myReview);
  const { state: reviewState, myRating } = resolveCompletedReviewUiState({
    requestId: job.id,
    reviewerId,
    reviews,
    pendingRequestIds,
  });

  return (
    <article
      data-testid="client-completed-history-card"
      data-job-id={job.id}
      className="relative min-w-0 overflow-hidden rounded-[1.35rem] border border-slate-100 bg-white p-3 shadow-[0_10px_30px_rgba(15,23,42,0.07)] sm:p-4"
    >
      <div
        className="absolute left-0 top-0 h-full w-1.5"
        style={{ backgroundColor: theme.iconColor }}
        aria-hidden
      />

      <div className="flex items-start gap-3 pl-1">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] border"
          style={{
            backgroundColor: theme.iconBg,
            borderColor: `${theme.iconColor}28`,
          }}
        >
          <CategoryIcon className="h-5 w-5" style={{ color: theme.iconColor }} strokeWidth={1.9} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-800">
              <Icons.CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              {t('service_review.service_completed')}
            </span>
            {hiredApplication?.isExclusive || job.exclusiveHelperId ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-800">
                <Icons.Crown className="h-3.5 w-3.5" aria-hidden />
                {t('client_dashboard.exclusive_application_badge')}
              </span>
            ) : null}
          </div>
          <h3 className="truncate text-base font-black leading-tight text-slate-950 sm:text-lg">
            {title}
          </h3>
          <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
            {subcategoryLabel
              ? `${translateCategory(job.category, t)} · ${subcategoryLabel}`
              : translateCategory(job.category, t)}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-1.5 text-[11px] sm:grid-cols-2">
        <div className="rounded-xl bg-slate-50 px-2.5 py-1.5">
          <span className="block font-black uppercase tracking-[0.06em] text-slate-400">
            {t('client_jobs.history_service_date')}
          </span>
          <span className="block truncate font-bold text-slate-800">{schedule || '—'}</span>
        </div>
        <div className="rounded-xl bg-slate-50 px-2.5 py-1.5">
          <span className="block font-black uppercase tracking-[0.06em] text-slate-400">
            {t('client_jobs.history_completed_date')}
          </span>
          <span className="block truncate font-bold text-slate-800">
            {completionTs ? formatHistoryDate(completionTs, locale) : t('service_review.service_completed')}
          </span>
        </div>
        <div className="rounded-xl bg-slate-50 px-2.5 py-1.5">
          <span className="block font-black uppercase tracking-[0.06em] text-slate-400">
            {t('client_dashboard.activity_modality')}
          </span>
          <span className="block truncate font-bold text-slate-800">{modality}</span>
        </div>
        <div className="rounded-xl bg-slate-50 px-2.5 py-1.5">
          <span className="block font-black uppercase tracking-[0.06em] text-slate-400">
            {t('client_jobs.history_agreed_value')}
          </span>
          <span className="block truncate font-bold text-slate-800">{agreedLabel || '—'}</span>
        </div>
        {locationLabel ? (
          <div className="rounded-xl bg-slate-50 px-2.5 py-1.5 sm:col-span-2">
            <span className="block font-black uppercase tracking-[0.06em] text-slate-400">
              {t('client_jobs.history_location')}
            </span>
            <span className="block truncate font-bold text-slate-800">{locationLabel}</span>
          </div>
        ) : null}
      </div>

      <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.06em] text-slate-400">
          {t('client_jobs.history_help_performed')}
        </p>
        {hiredApplication ? (
          <button
            type="button"
            data-testid="completed-hired-helper"
            onClick={() => onOpenHelperProfile(hiredApplication)}
            className="flex w-full items-start gap-3 rounded-xl text-left transition-colors hover:bg-white/80"
          >
            <img
              src={hiredApplication.helperAvatar}
              alt=""
              className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-white"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-slate-950">{hiredApplication.helperName}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-slate-500">
                <Icons.Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" aria-hidden />
                <span>{Number(hiredApplication.helperRating || 0).toFixed(1)}</span>
                <LinkHelpRankBadgeFromStats
                  completedCount={hiredApplication.helperJobs}
                  averageRating={hiredApplication.helperRating}
                  role="helper"
                  size="sm"
                  showLabel
                  t={t}
                />
              </p>
            </div>
            <Icons.ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          </button>
        ) : (
          <p className="text-xs font-semibold text-slate-500">{t('client_jobs.history_help_unknown')}</p>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          data-testid="completed-open-details"
          onClick={onOpenDetails}
          className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 hover:bg-slate-50"
        >
          <Icons.FileText className="h-3.5 w-3.5" aria-hidden />
          {t('client_jobs.history_view_details')}
        </button>
      </div>

      <div className="mt-2">
        <ReviewStateBlock state={reviewState} myRating={myRating} t={t} onRate={onRate} />
      </div>
    </article>
  );
}
