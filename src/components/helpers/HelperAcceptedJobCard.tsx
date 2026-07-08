import * as Icons from 'lucide-react';
import type { UpcomingJob, UpcomingWorkflowStatus } from '@/types/upcoming';
import { translateCategory, translateJobTitle, resolveCategoryId } from '@/utils/translateCategory';
import { getCategoryFeedTheme } from '@/utils/categoryFeedTheme';
import { getCategoryIconById } from '@/utils/categoryIcons';
import { formatScheduledDay, formatScheduledClock } from '@/utils/upcomingJobUtils';
import { avatarUrlForName } from '@/utils/avatarUrl';

type Props = {
  job: UpcomingJob;
  locale: string;
  t: (key: string, vars?: Record<string, string | number>) => string;
  onOpenDetails?: () => void;
  onOpenChat?: () => void;
};

const WORKFLOW_BADGE: Record<UpcomingWorkflowStatus, string> = {
  scheduled:                    'bg-sky-50 text-sky-700 border-sky-200',
  accepted:                     'bg-emerald-50 text-emerald-700 border-emerald-200',
  in_progress:                  'bg-amber-50 text-amber-800 border-amber-200',
  arriving:                     'bg-violet-50 text-violet-700 border-violet-200',
  awaiting_client_confirmation: 'bg-blue-50 text-blue-700 border-blue-200',
  completion_requested: 'bg-blue-50 text-blue-700 border-blue-200',
  auto_completed: 'bg-amber-50 text-amber-800 border-amber-200',
  completed:                    'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled:                    'bg-slate-100 text-slate-500 border-slate-200',
};

const WORKFLOW_LABEL_KEY: Record<UpcomingWorkflowStatus, string> = {
  scheduled:                    'upcoming_jobs.status_scheduled',
  accepted:                     'upcoming_jobs.status_scheduled',
  in_progress:                  'upcoming_jobs.status_in_progress',
  arriving:                     'upcoming_jobs.status_arriving',
  awaiting_client_confirmation: 'upcoming_jobs.status_awaiting_client_confirmation',
  completion_requested: 'upcoming_jobs.status_completion_requested',
  auto_completed: 'upcoming_jobs.status_auto_completed',
  completed:                    'upcoming_jobs.status_completed',
  cancelled:                    'upcoming_jobs.status_cancelled',
};

export function HelperAcceptedJobCard({ job, locale, t, onOpenDetails, onOpenChat }: Props) {
  const theme = getCategoryFeedTheme(job.category);
  const catId = resolveCategoryId(job.category) ?? 'other';
  const CategoryIcon = getCategoryIconById(catId);

  const hasSchedule = job.scheduledAt > 0;
  const shortLocation = job.location
    ? job.location.split(',').slice(0, 2).join(',').trim()
    : null;

  const mapsUrl = job.location
    ? `https://maps.google.com/?q=${encodeURIComponent(job.location)}`
    : null;

  return (
    <div
      className="relative flex overflow-hidden rounded-2xl border border-blue-100/60 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
      onClick={onOpenDetails}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onOpenDetails?.()}
    >
      {/* left accent bar — blue/green for accepted */}
      <div
        className="w-1 shrink-0 rounded-l-2xl"
        style={{ background: theme.iconColor }}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-2 p-3 sm:p-4">
        {/* row 1: category icon + category + workflow badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <div
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
              style={{ background: theme.iconBg }}
            >
              <CategoryIcon className="h-3.5 w-3.5" style={{ color: theme.iconColor }} />
            </div>
            <span className="truncate text-xs font-bold" style={{ color: theme.iconColor }}>
              {translateCategory(job.category, t)}
            </span>
          </div>
          <span
            className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${WORKFLOW_BADGE[job.workflowStatus] ?? 'border-slate-200 bg-slate-50 text-slate-500'}`}
          >
            {t(WORKFLOW_LABEL_KEY[job.workflowStatus] ?? 'upcoming_jobs.status_scheduled')}
          </span>
        </div>

        {/* row 2: title + client */}
        <div>
          <h3 className="truncate text-sm font-black leading-snug text-gray-900">
            {translateJobTitle(job.title, job.category, job.subcategory ?? null, t)}
          </h3>
          <div className="mt-0.5 flex items-center gap-1.5">
            <img
              src={job.clientAvatar || avatarUrlForName(job.clientName)}
              alt=""
              onError={(e) => { e.currentTarget.src = avatarUrlForName(job.clientName); }}
              className="h-4 w-4 rounded-full border border-gray-100 object-cover"
            />
            <span className="truncate text-xs text-gray-500">{job.clientName}</span>
            <span className="shrink-0 rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
              {t('upcoming_jobs.chat_unlocked_badge')}
            </span>
          </div>
        </div>

        {/* row 3: meta — date + location + value */}
        <div className="flex flex-wrap items-center gap-1.5">
          {hasSchedule && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
              <Icons.Clock className="h-3 w-3 shrink-0" />
              {formatScheduledDay(job.scheduledAt, locale)} · {formatScheduledClock(job.scheduledAt, locale)}
            </span>
          )}
          {shortLocation && (
            <>
              {hasSchedule && <span className="text-gray-300">·</span>}
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <Icons.MapPin className="h-3 w-3 shrink-0" />
                <span className="max-w-[140px] truncate">{shortLocation}</span>
              </span>
            </>
          )}
          {job.value && (
            <>
              <span className="text-gray-300">·</span>
              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-xs font-bold text-emerald-700">
                <Icons.Banknote className="h-3 w-3 shrink-0" />
                {job.value}
              </span>
            </>
          )}
        </div>

        {/* row 4: action bar */}
        <div
          className="flex flex-wrap gap-2 border-t border-gray-50 pt-2"
          onClick={(e) => e.stopPropagation()}
        >
          {onOpenChat && (
            <button
              type="button"
              onClick={onOpenChat}
              className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
            >
              <Icons.MessageSquare className="h-3.5 w-3.5" />
              {t('upcoming_jobs.open_chat')}
            </button>
          )}
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
              onClick={(e) => e.stopPropagation()}
            >
              <Icons.Navigation className="h-3.5 w-3.5" />
              {t('upcoming_jobs.view_location')}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
