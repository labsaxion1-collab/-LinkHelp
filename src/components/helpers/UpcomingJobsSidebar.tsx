import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import type { UpcomingJob, UpcomingWorkflowStatus } from '@/context/AppDataContext';
import { formatScheduledClock, formatScheduledDay } from '@/utils/upcomingJobUtils';
import { ROUTES } from '@/utils/constants';
import { translateJobTitle } from '@/utils/translateCategory';

function isActiveStatus(s: UpcomingWorkflowStatus) {
  return s === 'scheduled' || s === 'in_progress';
}

function relativeStartLabel(
  scheduledAt: number,
  now: number,
  locale: string,
  t: (k: string, v?: Record<string, string | number>) => string,
): string {
  const diff = scheduledAt - now;
  if (diff <= 0) return t('upcoming_jobs.starts_soon');
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return t('upcoming_jobs.starts_in_mins', { count: Math.max(1, mins) });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('upcoming_jobs.starts_in_hours', { count: hours });

  const d0 = new Date(now);
  const d1 = new Date(scheduledAt);
  const sameDay =
    d0.getFullYear() === d1.getFullYear() && d0.getMonth() === d1.getMonth() && d0.getDate() === d1.getDate();
  if (sameDay) return t('upcoming_jobs.rel_today');

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow =
    d1.getFullYear() === tomorrow.getFullYear() &&
    d1.getMonth() === tomorrow.getMonth() &&
    d1.getDate() === tomorrow.getDate();
  if (isTomorrow) return t('upcoming_jobs.rel_tomorrow');

  return formatScheduledDay(scheduledAt, locale);
}

interface UpcomingJobsSidebarProps {
  helperId: string;
  jobs: UpcomingJob[];
  locale: string;
  t: (key: string, vars?: Record<string, string | number>) => string;
  translateCategory: (raw: string, tf: (k: string) => string) => string;
  onSelectJob: (job: UpcomingJob) => void;
  onQuickReject?: (job: UpcomingJob) => void;
}

export function UpcomingJobsSidebar({
  helperId,
  jobs,
  locale,
  t,
  translateCategory,
  onSelectJob,
  onQuickReject,
}: UpcomingJobsSidebarProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  const active = useMemo(
    () =>
      jobs
        .filter((j) => j.helperId === helperId && isActiveStatus(j.workflowStatus))
        .sort((a, b) => a.scheduledAt - b.scheduledAt),
    [jobs, helperId],
  );

  if (active.length === 0) {
    return (
      <div className="mb-4">
        <h3 className="text-gray-500 font-semibold text-xs tracking-wider uppercase mb-3 px-1">
          {t('upcoming_jobs.section_title')}
        </h3>
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gradient-to-b from-gray-50 to-white p-5 text-center shadow-sm">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 mb-3">
            <Icons.CalendarOff className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-gray-700 mb-1">{t('upcoming_jobs.empty_title')}</p>
          <Link
            to={ROUTES.helperOpportunities}
            className="mt-3 inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20"
          >
            <Icons.Compass className="w-4 h-4" />
            {t('upcoming_jobs.explore_cta')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between gap-2 mb-3 px-1">
        <h3 className="text-gray-500 font-semibold text-xs tracking-wider uppercase">
          {t('upcoming_jobs.section_title')}
        </h3>
        <Link
          to={ROUTES.helperJobsUpcoming}
          className="text-[10px] font-bold text-blue-600 hover:text-blue-800 transition-colors shrink-0"
        >
          {t('upcoming_jobs.view_all')}
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-200/90 bg-slate-50 p-3 mb-3 shadow-sm">
        <p className="text-xs font-bold text-slate-800">{t('upcoming_jobs.upcoming_summary_title')}</p>
        <p className="text-[11px] text-slate-600 mt-1 leading-snug">{t('upcoming_jobs.upcoming_summary_sub')}</p>
      </div>

      <div className="flex flex-col gap-2.5 max-h-[min(52vh,420px)] overflow-y-auto pr-0.5 -mr-0.5">
        {active.map((job) => {
          const rel = relativeStartLabel(job.scheduledAt, now, locale, t);
          const dayShort = formatScheduledDay(job.scheduledAt, locale);
          const clock = formatScheduledClock(job.scheduledAt, locale);
          const cat = translateCategory(job.category, t);

          return (
            <div
              key={job.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectJob(job)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectJob(job);
                }
              }}
              className="group relative rounded-2xl border border-gray-200/90 bg-white p-3.5 shadow-sm hover:shadow-md hover:border-blue-200/80 hover:-translate-y-0.5 hover:scale-[1.01] transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wide text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md truncate max-w-[58%]">
                  {cat}
                </span>
                <span
                  className="text-[10px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md shrink-0 max-w-[48%] truncate"
                  title={t('upcoming_jobs.mvp_payment_note')}
                >
                  {t('helper_dashboard.compensation_neutral')}
                </span>
              </div>
              <h4 className="font-bold text-gray-900 text-sm leading-snug mb-1.5 line-clamp-2">{translateJobTitle(job.title, job.category, job.subcategory ?? null, t)}</h4>
              <p className="text-xs text-gray-500 flex items-center gap-1.5 mb-1">
                <Icons.Clock className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                <span className="truncate">
                  {dayShort} · {clock}
                </span>
              </p>
              <p className="text-xs text-gray-600 font-medium truncate mb-1">
                {t('upcoming_jobs.client_label', { name: job.clientName })}
              </p>
              <p className="text-[11px] font-bold text-violet-600 flex items-center gap-1">
                <Icons.Timer className="w-3.5 h-3.5" />
                {rel}
              </p>

              {onQuickReject && (
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuickReject(job);
                    }}
                    className="p-1.5 rounded-lg bg-white/90 border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 shadow-sm"
                    title={t('upcoming_jobs.cancel_job')}
                  >
                    <Icons.X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
