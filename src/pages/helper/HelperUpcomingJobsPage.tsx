import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { useSessionViewer } from '@/hooks/useSessionViewer';
import { useLanguage } from '@/context/LanguageContext';
import { useAppData, type Application, type UpcomingJob, type UpcomingWorkflowStatus } from '@/context/AppDataContext';
import { translateCategory, translateJobTitle } from '@/utils/translateCategory';
import { UpcomingJobDetailModal } from '@/components/modals/UpcomingJobDetailModal';
import { HelperOpportunityDetailModal } from '@/components/opportunities/HelperOpportunityDetailModal';
import { HelperApplicationCard } from '@/components/helpers/HelperApplicationCard';
import { formatScheduledClock, formatScheduledDay } from '@/utils/upcomingJobUtils';
import { formatJobScheduleDisplay } from '@/utils/jobDisplay';
import { ROUTES } from '@/utils/constants';
import { DesktopBackButton } from '@/components/layout/DesktopBackButton';
import { isJobCancelled } from '@/utils/jobVisibility';
import type { Job } from '@/types/job';
import { clsx } from 'clsx';

type TasksTab = 'applications' | 'accepted';

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
  const { jobs, upcomingJobs, updateUpcomingWorkflow, getHelperApplications, updateApplicationStatus } = useAppData();
  const [activeTab, setActiveTab] = useState<TasksTab>('applications');
  const [selectedJob, setSelectedJob] = useState<UpcomingJob | null>(null);
  const [upcomingOpen, setUpcomingOpen] = useState(false);
  const [detailJob, setDetailJob] = useState<Job | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Application | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);

  const locale = language === 'fr' ? 'fr-CA' : language === 'pt' ? 'pt-BR' : 'en-CA';

  const me = useSessionViewer();

  const applicationList = useMemo(() => {
    const apps = getHelperApplications(me.id).filter((app) => {
      if (!['pending', 'viewed', 'rejected'].includes(app.status)) return false;
      const request = jobs.find((j) => j.id === app.jobId);
      return !request || !isJobCancelled(request);
    });
    return apps.sort((a, b) => b.createdAt - a.createdAt);
  }, [getHelperApplications, me.id, jobs]);

  const acceptedList = useMemo(
    () =>
      upcomingJobs
        .filter((j) => {
          if (j.helperId !== me.id) return false;
          if (j.workflowStatus !== 'scheduled' && j.workflowStatus !== 'in_progress') return false;
          const request = jobs.find((r) => r.id === j.jobId);
          return !request || !isJobCancelled(request);
        })
        .sort((a, b) => a.scheduledAt - b.scheduledAt),
    [upcomingJobs, me.id, jobs],
  );

  const selectedFresh = useMemo(
    () => (selectedJob ? acceptedList.find((j) => j.id === selectedJob.id) ?? selectedJob : null),
    [selectedJob, acceptedList],
  );

  const openUpcomingDetail = (job: UpcomingJob) => {
    setSelectedJob(job);
    setUpcomingOpen(true);
  };

  const openRequestDetail = (job: Job) => {
    setDetailJob(job);
    setDetailOpen(true);
  };

  const confirmCancelApplication = async () => {
    if (!cancelTarget) return;
    setCancelBusy(true);
    try {
      await updateApplicationStatus(cancelTarget.id, 'cancelled');
      setCancelTarget(null);
    } catch (e) {
      console.error('[LinkHelp] cancel application', e);
    } finally {
      setCancelBusy(false);
    }
  };

  const tc = (raw: string) => translateCategory(raw, t);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#f0f2f5] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <DesktopBackButton className="mb-6" />
        <Link
          to={ROUTES.helperDashboard}
          className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-blue-600 transition-colors hover:text-blue-800 lg:hidden"
        >
          <Icons.ChevronLeft className="h-4 w-4" /> {t('nav.back')}
        </Link>

        <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white p-6 sm:p-8">
            <h1 className="text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">
              {t('upcoming_jobs.my_tasks_title')}
            </h1>
            <p className="mt-2 text-sm font-medium text-gray-500">{t('upcoming_jobs.my_tasks_subtitle')}</p>
          </div>

          <div className="flex border-b border-gray-100">
            <button
              type="button"
              onClick={() => setActiveTab('applications')}
              className={clsx(
                'flex-1 px-4 py-3.5 text-sm font-bold transition-colors',
                activeTab === 'applications'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-800',
              )}
            >
              {t('upcoming_jobs.tab_applications')}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('accepted')}
              className={clsx(
                'flex-1 px-4 py-3.5 text-sm font-bold transition-colors',
                activeTab === 'accepted'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-800',
              )}
            >
              {t('upcoming_jobs.tab_accepted')}
            </button>
          </div>

          <div className="space-y-3 p-4 sm:p-6">
            {activeTab === 'applications' ? (
              applicationList.length === 0 ? (
                <div className="px-4 py-16 text-center">
                  <Icons.ClipboardList className="mx-auto mb-4 h-14 w-14 text-gray-200" />
                  <p className="mb-4 font-semibold text-gray-600">{t('helper_dashboard.empty_applications')}</p>
                  <Link
                    to={ROUTES.helperOpportunities}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-md transition-colors hover:bg-blue-700"
                  >
                    <Icons.Compass className="h-4 w-4" />
                    {t('upcoming_jobs.explore_cta')}
                  </Link>
                </div>
              ) : (
                applicationList.map((app) => {
                  const job = jobs.find((j) => j.id === app.jobId);
                  if (!job) return null;
                  return (
                    <HelperApplicationCard
                      key={app.id}
                      app={app}
                      job={job}
                      t={t}
                      onOpenDetails={() => openRequestDetail(job)}
                      onCancel={() => setCancelTarget(app)}
                    />
                  );
                })
              )
            ) : acceptedList.length === 0 ? (
              <div className="px-4 py-16 text-center">
                <Icons.CalendarOff className="mx-auto mb-4 h-14 w-14 text-gray-200" />
                <p className="mb-4 font-semibold text-gray-600">{t('upcoming_jobs.empty_title')}</p>
                <Link
                  to={ROUTES.helperOpportunities}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-md transition-colors hover:bg-blue-700"
                >
                  <Icons.Compass className="h-4 w-4" />
                  {t('upcoming_jobs.explore_cta')}
                </Link>
              </div>
            ) : (
              acceptedList.map((job) => (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => openUpcomingDetail(job)}
                  className="flex w-full flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md sm:flex-row sm:items-center sm:p-5"
                >
                  <img
                    src={job.clientAvatar}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-2xl border border-gray-100 object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase ${badgeClass(job.workflowStatus)}`}
                      >
                        {statusLabel(job.workflowStatus, t)}
                      </span>
                      <span className="rounded-md border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                        {tc(job.category)}
                      </span>
                    </div>
                    <h2 className="truncate text-base font-bold leading-snug text-gray-900 sm:text-lg">
                      {translateJobTitle(job.title, job.category, null, t)}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">{t('upcoming_jobs.client_label', { name: job.clientName })}</p>
                    <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <Icons.Clock className="h-3.5 w-3.5" />
                        {formatScheduledDay(job.scheduledAt, locale)} · {formatScheduledClock(job.scheduledAt, locale)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Icons.MapPin className="h-3.5 w-3.5" />
                        {job.location}
                      </span>
                      <span className="font-bold text-emerald-700">${job.value}</span>
                    </p>
                  </div>
                  <Icons.ChevronRight className="hidden h-5 w-5 shrink-0 text-gray-300 sm:block" />
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <UpcomingJobDetailModal
        job={selectedFresh}
        open={upcomingOpen}
        onClose={() => {
          setUpcomingOpen(false);
          setSelectedJob(null);
        }}
        t={t}
        translateCategory={tc}
        locale={locale}
        onUpdateWorkflow={updateUpcomingWorkflow}
      />

      <HelperOpportunityDetailModal
        job={detailJob}
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setDetailJob(null);
        }}
        hasApplied
        t={t}
        translateCategory={tc}
        formatJobSchedule={formatJobScheduleDisplay}
        locale={locale}
      />

      {cancelTarget && (
        <div
          className="fixed inset-0 z-[110] flex animate-in fade-in items-center justify-center bg-gray-900/50 p-4 backdrop-blur-sm duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-app-title"
          onClick={() => !cancelBusy && setCancelTarget(null)}
        >
          <div
            className="w-full max-w-md animate-in zoom-in-95 rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="cancel-app-title" className="text-lg font-black text-gray-900">
              {t('helper_dashboard.cancel_application_title')}
            </h2>
            <p className="mt-2 text-sm font-medium leading-relaxed text-gray-600">
              {t('helper_dashboard.cancel_application_body')}
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={cancelBusy}
                onClick={() => setCancelTarget(null)}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                disabled={cancelBusy}
                onClick={() => void confirmCancelApplication()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {cancelBusy ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : null}
                {t('helper_dashboard.cancel_application_confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
