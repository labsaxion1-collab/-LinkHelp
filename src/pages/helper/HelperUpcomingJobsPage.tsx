import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { useSessionViewer } from '@/hooks/useSessionViewer';
import { useLanguage } from '@/context/LanguageContext';
import { useAppData, type UpcomingJob, type UpcomingWorkflowStatus } from '@/context/AppDataContext';
import { translateCategory } from '@/utils/translateCategory';
import { UpcomingJobDetailModal } from '@/components/modals/UpcomingJobDetailModal';
import { formatScheduledClock, formatScheduledDay } from '@/utils/upcomingJobUtils';
import { ROUTES } from '@/utils/constants';
import { DesktopBackButton } from '@/components/layout/DesktopBackButton';

function badgeClass(s: UpcomingWorkflowStatus): string {
  switch (s) {
    case 'scheduled':
      return 'bg-sky-100 text-sky-800 border-sky-200';
    case 'in_progress':
      return 'bg-amber-100 text-amber-900 border-amber-200';
    case 'arriving':
      return 'bg-violet-100 text-violet-800 border-violet-200';
    case 'awaiting_client_confirmation':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'completed':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'cancelled':
      return 'bg-gray-100 text-gray-600 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

function statusLabel(s: UpcomingWorkflowStatus, t: (k: string) => string) {
  const map: Record<UpcomingWorkflowStatus, string> = {
    scheduled: 'upcoming_jobs.status_scheduled',
    in_progress: 'upcoming_jobs.status_in_progress',
    arriving: 'upcoming_jobs.status_arriving',
    awaiting_client_confirmation: 'upcoming_jobs.status_awaiting_client_confirmation',
    completed: 'upcoming_jobs.status_completed',
    cancelled: 'upcoming_jobs.status_cancelled',
  };
  return t(map[s]);
}

export default function HelperUpcomingJobsPage() {
  const { t, language } = useLanguage();
  const { upcomingJobs, updateUpcomingWorkflow } = useAppData();
  const [selected, setSelected] = useState<UpcomingJob | null>(null);
  const [open, setOpen] = useState(false);

  const locale = language === 'fr' ? 'fr-CA' : language === 'pt' ? 'pt-BR' : 'en-CA';

  const me = useSessionViewer();
  const list = useMemo(
    () =>
      upcomingJobs
        .filter((j) => j.helperId === me.id)
        .sort((a, b) => a.scheduledAt - b.scheduledAt),
    [upcomingJobs, me.id],
  );

  const selectedFresh = useMemo(
    () => (selected ? list.find((j) => j.id === selected.id) ?? selected : null),
    [selected, list],
  );

  const openDetail = (job: UpcomingJob) => {
    setSelected(job);
    setOpen(true);
  };

  const tc = (raw: string) => translateCategory(raw, t);

  return (
    <div className="bg-[#f0f2f5] min-h-[calc(100vh-64px)] py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <DesktopBackButton className="mb-6" />
        <Link
          to={ROUTES.helperDashboard}
          className="lg:hidden inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-800 mb-6 transition-colors"
        >
          <Icons.ChevronLeft className="w-4 h-4" /> {t('nav.back')}
        </Link>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white">
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">{t('upcoming_jobs.section_title')}</h1>
            <p className="text-gray-500 font-medium mt-2 text-sm">{t('upcoming_jobs.modal_title')}</p>
          </div>

          <div className="p-4 sm:p-6 space-y-3">
            {list.length === 0 ? (
              <div className="text-center py-16 px-4">
                <Icons.CalendarOff className="w-14 h-14 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-600 font-semibold mb-4">{t('upcoming_jobs.empty_title')}</p>
                <Link
                  to={ROUTES.helperOpportunities}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors shadow-md"
                >
                  <Icons.Compass className="w-4 h-4" />
                  {t('upcoming_jobs.explore_cta')}
                </Link>
              </div>
            ) : (
              list.map((job) => (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => openDetail(job)}
                  className="w-full text-left rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 hover:border-blue-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col sm:flex-row sm:items-center gap-4"
                >
                  <img
                    src={job.clientAvatar}
                    alt=""
                    className="w-14 h-14 rounded-2xl object-cover border border-gray-100 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${badgeClass(job.workflowStatus)}`}>
                        {statusLabel(job.workflowStatus, t)}
                      </span>
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                        {tc(job.category)}
                      </span>
                    </div>
                    <h2 className="font-bold text-gray-900 text-base sm:text-lg leading-snug truncate">{job.title}</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {t('upcoming_jobs.client_label', { name: job.clientName })}
                    </p>
                    <p className="text-xs text-gray-500 mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="inline-flex items-center gap-1">
                        <Icons.Clock className="w-3.5 h-3.5" />
                        {formatScheduledDay(job.scheduledAt, locale)} · {formatScheduledClock(job.scheduledAt, locale)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Icons.MapPin className="w-3.5 h-3.5" />
                        {job.location}
                      </span>
                      <span className="font-bold text-emerald-700">${job.value}</span>
                    </p>
                  </div>
                  <Icons.ChevronRight className="w-5 h-5 text-gray-300 shrink-0 hidden sm:block" />
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <UpcomingJobDetailModal
        job={selectedFresh}
        open={open}
        onClose={() => {
          setOpen(false);
          setSelected(null);
        }}
        t={t}
        translateCategory={tc}
        locale={locale}
        onUpdateWorkflow={updateUpcomingWorkflow}
      />
    </div>
  );
}
