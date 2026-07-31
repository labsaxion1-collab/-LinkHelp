import { useEffect, useState } from 'react';
import * as Icons from 'lucide-react';
import { clsx } from 'clsx';
import type { Job } from '@/types/job';
import type { UpcomingJob, UpcomingWorkflowStatus } from '@/types/upcoming';
import { translateJobTitle, resolveCategoryId } from '@/utils/translateCategory';
import { getCategoryFeedTheme } from '@/utils/categoryFeedTheme';
import { getCategoryIconById } from '@/utils/categoryIcons';
import { formatScheduledClock, formatScheduledDay } from '@/utils/upcomingJobUtils';
import { avatarUrlForName } from '@/utils/avatarUrl';
import { LhCard } from '@/components/design-system/LhCard';
import { getRequestDescriptionForViewer } from '@/utils/requestDescriptionDisplay';
import type { AppLanguage } from '@/services/translationService';
import {
  clientFirstName,
  formatRelativeScheduleLabel,
  type HelperTaskAccordion,
  canShowCompleteWorkButton,
  canShowReviewButton,
} from '@/utils/helperTaskCard';
import { isAwaitingClientCompletion, shouldHideCompleteButton } from '@/utils/serviceWorkflow';

type Props = {
  job: UpcomingJob;
  requestJob?: Job | null;
  locale: string;
  language?: AppLanguage;
  t: (key: string, vars?: Record<string, string | number>) => string;
  expandedAccordion: HelperTaskAccordion;
  onToggleDescription: () => void;
  onComplete?: () => void;
  onReview?: () => void;
  onOpenChat?: () => void;
  completeLoading?: boolean;
  hasPendingReview?: boolean;
  reviewSubmitted?: boolean;
  myReviewRating?: number | null;
  historyMode?: boolean;
  requestJobStatus?: Job['status'];
};

const WORKFLOW_BADGE: Record<UpcomingWorkflowStatus, string> = {
  scheduled: 'bg-sky-50 text-sky-700 border-sky-200',
  accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  in_progress: 'bg-amber-50 text-amber-800 border-amber-200',
  arriving: 'bg-violet-50 text-violet-700 border-violet-200',
  awaiting_client_confirmation: 'bg-blue-50 text-blue-700 border-blue-200',
  completion_requested: 'bg-blue-50 text-blue-700 border-blue-200',
  auto_completed: 'bg-amber-50 text-amber-800 border-amber-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
};

const WORKFLOW_LABEL_KEY: Record<UpcomingWorkflowStatus, string> = {
  scheduled: 'upcoming_jobs.status_scheduled',
  accepted: 'upcoming_jobs.status_scheduled',
  in_progress: 'upcoming_jobs.status_in_progress',
  arriving: 'upcoming_jobs.status_arriving',
  awaiting_client_confirmation: 'upcoming_jobs.status_completion_requested',
  completion_requested: 'upcoming_jobs.status_completion_requested',
  auto_completed: 'upcoming_jobs.status_auto_completed',
  completed: 'upcoming_jobs.status_completed',
  cancelled: 'upcoming_jobs.status_cancelled',
};

const actionBtn =
  'inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[14px] px-3 py-2.5 text-[12px] font-bold transition-all sm:text-[13px]';

export function HelperAcceptedJobCard({
  job,
  requestJob,
  locale,
  language = 'pt',
  t,
  expandedAccordion,
  onToggleDescription,
  onComplete,
  onReview,
  onOpenChat,
  completeLoading = false,
  hasPendingReview = false,
  reviewSubmitted = false,
  myReviewRating = null,
  historyMode = false,
  requestJobStatus = 'in_progress',
}: Props) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const theme = getCategoryFeedTheme(job.category);
  const catId = resolveCategoryId(job.category) ?? 'other';
  const CategoryIcon = getCategoryIconById(catId);
  const title = translateJobTitle(job.title, job.category, job.subcategory ?? null, t);
  const descriptionOpen = expandedAccordion === 'description';
  const firstName = clientFirstName(job.clientName);

  const relativeSchedule = job.scheduledAt
    ? formatRelativeScheduleLabel(job.scheduledAt, now, locale, t)
    : '';
  const clockLabel = job.scheduledAt ? formatScheduledClock(job.scheduledAt, locale) : '';
  const dayLabel = job.scheduledAt ? formatScheduledDay(job.scheduledAt, locale) : '';

  const locationText = requestJob?.location?.trim() || job.location?.trim() || '';
  const locationDisplay = locationText
    ? locationText.split(',').slice(0, 2).join(',').trim()
    : t('jobs.remote');

  const descriptionView = getRequestDescriptionForViewer(
    requestJob?.description ?? job.description ?? '',
    language,
  );

  const showComplete =
    !historyMode &&
    onComplete &&
    !shouldHideCompleteButton(requestJobStatus, job.workflowStatus) &&
    canShowCompleteWorkButton(job.workflowStatus);
  const showReview =
    onReview &&
    !reviewSubmitted &&
    canShowReviewButton(job.workflowStatus, requestJobStatus, hasPendingReview);
  const awaitingClient = !historyMode && isAwaitingClientCompletion(job.workflowStatus);
  const clientRating = requestJob?.clientRating ?? null;

  return (
    <LhCard
      padding="none"
      className={clsx(
        'relative w-full max-w-full overflow-hidden rounded-[22px] border border-[rgba(15,23,42,0.08)] bg-white',
        'shadow-[0_2px_12px_rgba(15,23,42,0.05),0_6px_28px_rgba(15,23,42,0.06)]',
      )}
    >
      <div
        className="h-[4px] w-full shrink-0 rounded-t-[22px]"
        style={{
          background: `linear-gradient(90deg, ${theme.iconColor} 0%, ${theme.iconColor}55 55%, transparent 100%)`,
        }}
        aria-hidden
      />

      <div className="px-3 pb-3 pt-3 sm:px-4 sm:pb-4 sm:pt-4">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl border sm:h-14 sm:w-14"
            style={{
              backgroundColor: theme.iconBg,
              borderColor: `${theme.iconColor}28`,
            }}
          >
            <CategoryIcon className="h-6 w-6" style={{ color: theme.iconColor }} strokeWidth={1.9} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="min-w-0 flex-1 text-[15px] font-bold leading-snug text-[#0F172A] sm:text-[17px]">
                {title}
              </h3>
              <span
                className={clsx(
                  'shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                  WORKFLOW_BADGE[job.workflowStatus] ?? 'border-slate-200 bg-slate-50 text-slate-500',
                )}
              >
                {t(WORKFLOW_LABEL_KEY[job.workflowStatus] ?? 'upcoming_jobs.status_scheduled')}
              </span>
            </div>

            <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-600">
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <img
                  src={job.clientAvatar || avatarUrlForName(job.clientName)}
                  alt=""
                  onError={(e) => {
                    e.currentTarget.src = avatarUrlForName(job.clientName);
                  }}
                  className="h-5 w-5 shrink-0 rounded-full object-cover ring-1 ring-white"
                />
                <span className="truncate">{firstName}</span>
                {clientRating != null && clientRating > 0 ? (
                  <span className="inline-flex items-center gap-0.5 text-slate-500">
                    <Icons.Star className="h-3 w-3 fill-yellow-400 text-yellow-400" aria-hidden />
                    {Number(clientRating).toFixed(1)}
                  </span>
                ) : null}
              </span>
              {relativeSchedule ? (
                <span className="inline-flex items-center gap-1 text-slate-500">
                  <Icons.Clock className="h-3 w-3 shrink-0" />
                  {relativeSchedule}
                </span>
              ) : null}
              {job.value ? (
                <span className="inline-flex items-center gap-1 text-emerald-700">
                  <Icons.Banknote className="h-3 w-3 shrink-0" />
                  {job.value}
                </span>
              ) : null}
              {locationDisplay ? (
                <span className="inline-flex max-w-full items-center gap-1 text-slate-500">
                  <Icons.MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{locationDisplay}</span>
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 border-t border-[rgba(15,23,42,0.06)] pt-3">
          <button
            type="button"
            onClick={onToggleDescription}
            aria-expanded={descriptionOpen}
            className={clsx(
              actionBtn,
              'flex-1 border sm:flex-none sm:min-w-[140px]',
              descriptionOpen
                ? 'border-blue-300 bg-blue-50 text-blue-800'
                : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50',
            )}
          >
            {t('helper_tasks.description_toggle')}
            <Icons.ChevronDown
              className={clsx('h-3.5 w-3.5 shrink-0 transition-transform', descriptionOpen && 'rotate-180')}
            />
          </button>

          {onOpenChat ? (
            <button
              type="button"
              onClick={onOpenChat}
              className={clsx(actionBtn, 'flex-1 border border-blue-200 bg-blue-50 text-blue-700 sm:flex-none')}
            >
              <Icons.MessageSquare className="h-3.5 w-3.5 shrink-0" />
              {t('upcoming_jobs.open_chat')}
            </button>
          ) : null}
        </div>

        {descriptionOpen ? (
          <div className="overflow-hidden border-t border-slate-200/80 bg-gradient-to-b from-slate-50/90 to-white px-1 py-3 sm:px-0">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
              {t('helper_tasks.observations_label')}
            </p>
            <p className="mt-2 min-h-[64px] max-h-36 overflow-y-auto whitespace-pre-wrap text-[13px] font-medium leading-relaxed text-slate-800">
              {descriptionView.display || t('upcoming_jobs.no_observations')}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-700">
              <div className="rounded-xl border border-slate-100 bg-white px-2.5 py-2">
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                  {t('helper_tasks.date_label')}
                </p>
                <p className="mt-1">{dayLabel || '—'}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white px-2.5 py-2">
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                  {t('helper_tasks.time_label')}
                </p>
                <p className="mt-1">{clockLabel || '—'}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white px-2.5 py-2">
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                  {t('helper_tasks.distance_label')}
                </p>
                <p className="mt-1 truncate">{locationDisplay}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white px-2.5 py-2">
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                  {t('helper_tasks.agreed_payment_label')}
                </p>
                <p className="mt-1 text-emerald-700">{job.value || t('upcoming_jobs.payment_to_arrange')}</p>
              </div>
            </div>
            <div className="mt-2 rounded-xl border border-slate-100 bg-white px-2.5 py-2">
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                {t('upcoming_jobs.status_label')}
              </p>
              <p className="mt-1 font-bold">
                {t(WORKFLOW_LABEL_KEY[job.workflowStatus] ?? 'upcoming_jobs.status_scheduled')}
              </p>
            </div>
          </div>
        ) : null}

        {showComplete || showReview || reviewSubmitted || awaitingClient ? (
          <div className="mt-3 space-y-2">
            {showComplete ? (
              <button
                type="button"
                disabled={completeLoading}
                onClick={onComplete}
                className={clsx(
                  actionBtn,
                  'bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60',
                )}
              >
                {completeLoading ? (
                  <Icons.Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Icons.CheckCircle2 className="h-4 w-4" />
                )}
                {t('upcoming_jobs.complete_work')}
              </button>
            ) : null}
            {showReview ? (
              <button
                type="button"
                onClick={onReview}
                data-testid="helper-review-client"
                className={clsx(actionBtn, 'border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100')}
              >
                <Icons.Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                {t('service_review.rate_action')}
              </button>
            ) : null}
            {reviewSubmitted ? (
              <div
                data-testid="helper-review-submitted"
                className={clsx(
                  actionBtn,
                  'border border-emerald-200 bg-emerald-50 text-emerald-900',
                )}
              >
                <Icons.CheckCircle2 className="h-4 w-4" />
                {t('service_review.review_submitted')}
                {myReviewRating != null ? (
                  <span className="inline-flex items-center gap-0.5">
                    <Icons.Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {myReviewRating.toFixed(1)}
                  </span>
                ) : null}
              </div>
            ) : null}
            {awaitingClient && !showComplete && !showReview ? (
              <p className="text-center text-[11px] font-semibold text-blue-700">
                {t('upcoming_jobs.awaiting_client_note')}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </LhCard>
  );
}
