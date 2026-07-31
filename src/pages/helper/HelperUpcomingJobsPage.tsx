import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { useSessionViewer } from '@/hooks/useSessionViewer';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { useServiceReview } from '@/context/ServiceReviewContext';
import {
  useAppData,
  type Application,
  type UpcomingJob,
  type UpcomingWorkflowStatus,
} from '@/context/AppDataContext';
import { HelperApplicationCard } from '@/components/helpers/HelperApplicationCard';
import { HelperAcceptedJobCard } from '@/components/helpers/HelperAcceptedJobCard';
import { ROUTES } from '@/utils/constants';
import { DesktopBackButton } from '@/components/layout/DesktopBackButton';
import { CloseToHomeButton } from '@/components/layout/CloseToHomeButton';
import { isJobCancelled } from '@/utils/jobVisibility';
import {
  helperTaskAccordionKey,
  helperAcceptedAccordionKey,
  toggleHelperTaskAccordion,
  type HelperTaskAccordion,
} from '@/utils/helperTaskCard';
import { isCompletedWorkflowStatus } from '@/utils/completedServiceHistory';
import { clsx } from 'clsx';

const ACTIVE_WORKFLOW: UpcomingWorkflowStatus[] = [
  'scheduled',
  'accepted',
  'in_progress',
  'arriving',
  'awaiting_client_confirmation',
  'completion_requested',
];

type TasksTab = 'applications' | 'accepted' | 'completed';

export default function HelperUpcomingJobsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { showToast } = useToast();
  const { openReviewByRequestId } = useServiceReview();
  const {
    jobs,
    upcomingJobs,
    getHelperApplications,
    updateApplicationStatus,
    finalizeServiceCompletion,
    pendingServiceReviews,
    reviews,
  } = useAppData();

  const [activeTab, setActiveTab] = useState<TasksTab>(() => {
    const st = location.state as { tasksTab?: TasksTab } | null;
    if (st?.tasksTab === 'accepted' || st?.tasksTab === 'completed') return st.tasksTab;
    return 'applications';
  });
  const [appAccordion, setAppAccordion] = useState<Record<string, HelperTaskAccordion>>({});
  const [acceptedAccordion, setAcceptedAccordion] = useState<Record<string, HelperTaskAccordion>>({});
  const [cancelTarget, setCancelTarget] = useState<Application | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [completeBusyId, setCompleteBusyId] = useState<string | null>(null);

  const locale = language === 'fr' ? 'fr-CA' : language === 'pt' ? 'pt-BR' : 'en-CA';
  const me = useSessionViewer();

  useEffect(() => {
    const st = location.state as { tasksTab?: TasksTab } | null;
    if (st?.tasksTab) setActiveTab(st.tasksTab);
  }, [location.state]);

  const applicationList = useMemo(() => {
    const apps = getHelperApplications(me.id).filter((app) => {
      if (!['pending', 'viewed', 'rejected', 'cancelled'].includes(app.status)) return false;
      const request = jobs.find((j) => j.id === app.jobId);
      if (!request || isJobCancelled(request)) return false;
      const hired = upcomingJobs.some(
        (u) => u.jobId === app.jobId && u.helperId === me.id && ACTIVE_WORKFLOW.includes(u.workflowStatus),
      );
      return !hired;
    });
    return apps.sort((a, b) => b.createdAt - a.createdAt);
  }, [getHelperApplications, me.id, jobs, upcomingJobs]);

  const acceptedList = useMemo(
    () =>
      upcomingJobs
        .filter((j) => {
          if (j.helperId !== me.id) return false;
          if (!ACTIVE_WORKFLOW.includes(j.workflowStatus)) return false;
          const request = jobs.find((r) => r.id === j.jobId);
          if (request?.status === 'completed') return false;
          return !request || !isJobCancelled(request);
        })
        .sort((a, b) => a.scheduledAt - b.scheduledAt),
    [upcomingJobs, me.id, jobs],
  );

  const completedList = useMemo(
    () =>
      upcomingJobs
        .filter((j) => {
          if (j.helperId !== me.id) return false;
          const request = jobs.find((r) => r.id === j.jobId);
          if (request && isJobCancelled(request)) return false;
          if (isCompletedWorkflowStatus(j.workflowStatus)) return true;
          return request?.status === 'completed';
        })
        .sort((a, b) => b.scheduledAt - a.scheduledAt),
    [upcomingJobs, me.id, jobs],
  );

  const pendingReviewIds = useMemo(
    () => new Set(pendingServiceReviews.map((p) => p.requestId)),
    [pendingServiceReviews],
  );

  const myReviewedRequestIds = useMemo(
    () => new Set(reviews.filter((r) => r.reviewerId === me.id).map((r) => r.requestId)),
    [reviews, me.id],
  );

  const toggleAppAccordion = (appId: string, panel: Exclude<HelperTaskAccordion, null>) => {
    setAppAccordion((prev) => ({
      ...prev,
      [appId]: toggleHelperTaskAccordion(prev[appId] ?? null, panel),
    }));
  };

  const toggleAcceptedDescription = (upcomingId: string) => {
    setAcceptedAccordion((prev) => ({
      ...prev,
      [upcomingId]: prev[upcomingId] === 'description' ? null : 'description',
    }));
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

  const handleCompleteWork = async (job: UpcomingJob) => {
    setCompleteBusyId(job.id);
    try {
      await finalizeServiceCompletion({
        requestId: job.jobId,
        upcomingJobId: job.id,
        role: 'helper',
      });
      showToast(t('upcoming_jobs.complete_work_success'), 'success');
      setActiveTab('completed');
      window.setTimeout(() => openReviewByRequestId(job.jobId), 400);
    } catch (e) {
      console.error('[LinkHelp] complete work', e);
      showToast(t('upcoming_jobs.complete_work_error'), 'error');
    } finally {
      setCompleteBusyId(null);
    }
  };

  const renderJobCards = (list: UpcomingJob[], historyMode: boolean) => {
    if (list.length === 0) {
      return (
        <div className="px-4 py-16 text-center">
          <Icons.CalendarOff className="mx-auto mb-4 h-14 w-14 text-gray-200" />
          <p className="mb-4 font-semibold text-gray-600">
            {historyMode ? t('upcoming_jobs.empty_completed_title') : t('upcoming_jobs.empty_title')}
          </p>
          {!historyMode ? (
            <Link
              to={ROUTES.helperOpportunities}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-md transition-colors hover:bg-blue-700"
            >
              <Icons.Compass className="h-4 w-4" />
              {t('upcoming_jobs.explore_cta')}
            </Link>
          ) : null}
        </div>
      );
    }

    return list.map((job) => {
      const requestJob = jobs.find((j) => j.id === job.jobId);
      const accKey = helperAcceptedAccordionKey(job.id);
      const myRating =
        reviews.find((r) => r.requestId === job.jobId && r.reviewerId === me.id)?.rating ?? null;
      return (
        <HelperAcceptedJobCard
          key={job.id}
          job={job}
          requestJob={requestJob}
          locale={locale}
          language={language}
          t={t}
          expandedAccordion={acceptedAccordion[accKey] ?? null}
          onToggleDescription={() => toggleAcceptedDescription(job.id)}
          onComplete={historyMode ? undefined : () => void handleCompleteWork(job)}
          onReview={() => openReviewByRequestId(job.jobId)}
          onOpenChat={() => navigate(ROUTES.messages)}
          completeLoading={completeBusyId === job.id}
          hasPendingReview={pendingReviewIds.has(job.jobId)}
          reviewSubmitted={myReviewedRequestIds.has(job.jobId)}
          myReviewRating={myRating}
          historyMode={historyMode}
          requestJobStatus={requestJob?.status ?? (historyMode ? 'completed' : 'in_progress')}
        />
      );
    });
  };

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
          <div className="relative border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white p-6 sm:p-8">
            <CloseToHomeButton className="absolute right-4 top-4 sm:right-6 sm:top-6" />
            <h1 className="pr-12 text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">
              {t('upcoming_jobs.my_tasks_title')}
            </h1>
            <p className="mt-2 text-sm font-medium text-gray-500">{t('upcoming_jobs.my_tasks_subtitle')}</p>
          </div>

          <div className="flex border-b border-gray-100">
            {(
              [
                { id: 'applications' as const, labelKey: 'upcoming_jobs.tab_applications' },
                { id: 'accepted' as const, labelKey: 'upcoming_jobs.tab_accepted' },
                { id: 'completed' as const, labelKey: 'upcoming_jobs.tab_completed' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'flex-1 px-2 py-3.5 text-center text-[11px] font-bold transition-colors sm:px-4 sm:text-sm',
                  activeTab === tab.id
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-800',
                )}
              >
                {t(tab.labelKey)}
              </button>
            ))}
          </div>

          <div className="space-y-3 p-4 sm:p-6">
            {activeTab === 'applications' ? (
              applicationList.length === 0 ? (
                <div className="px-4 py-16 text-center">
                  <Icons.ClipboardList className="mx-auto mb-4 h-14 w-14 text-gray-200" />
                  <p className="mb-4 font-semibold text-gray-600">
                    {t('helper_dashboard.empty_applications')}
                  </p>
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
                  const key = helperTaskAccordionKey(app.id);
                  return (
                    <HelperApplicationCard
                      key={app.id}
                      app={app}
                      job={job}
                      t={t}
                      language={language}
                      expandedAccordion={appAccordion[key] ?? null}
                      onToggleAccordion={(panel) => toggleAppAccordion(app.id, panel)}
                      onCancel={() => setCancelTarget(app)}
                      onOpenChat={() => navigate(ROUTES.messages)}
                    />
                  );
                })
              )
            ) : activeTab === 'completed' ? (
              renderJobCards(completedList, true)
            ) : (
              renderJobCards(acceptedList, false)
            )}
          </div>
        </div>
      </div>

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
                {t('helper_tasks.cancel_short')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
