import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { clsx } from 'clsx';
import { AppPageShell } from '@/components/design-system/AppPageShell';
import { DesktopBackButton } from '@/components/layout/DesktopBackButton';
import { HelperApplicationCard } from '@/components/helpers/HelperApplicationCard';
import { HelperCompletedHistoryCard } from '@/components/helpers/HelperCompletedHistoryCard';
import { useSessionViewer } from '@/hooks/useSessionViewer';
import { useLanguage } from '@/context/LanguageContext';
import { useServiceReview } from '@/context/ServiceReviewContext';
import { useAppData } from '@/context/AppDataContext';
import { ROUTES } from '@/utils/constants';
import { helperTaskAccordionKey, toggleHelperTaskAccordion, type HelperTaskAccordion } from '@/utils/helperTaskCard';
import { partitionHelperHistory } from '@/utils/helperHistoryBuckets';

type HistoryTab = 'applications' | 'completed';

export default function HelperHistoryPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { openReviewByRequestId, openSubmittedReviewByRequestId } = useServiceReview();
  const { jobs, upcomingJobs, applications, reviews, pendingServiceReviews } = useAppData();
  const me = useSessionViewer();
  const locale = language === 'fr' ? 'fr-CA' : language === 'pt' ? 'pt-BR' : 'en-CA';

  const [activeTab, setActiveTab] = useState<HistoryTab>(() => {
    const st = location.state as { historyTab?: HistoryTab } | null;
    return st?.historyTab === 'completed' ? 'completed' : 'applications';
  });
  const [appAccordion, setAppAccordion] = useState<Record<string, HelperTaskAccordion>>({});

  useEffect(() => {
    const st = location.state as { historyTab?: HistoryTab } | null;
    if (st?.historyTab === 'completed' || st?.historyTab === 'applications') {
      setActiveTab(st.historyTab);
    }
  }, [location.state]);

  const partitioned = useMemo(
    () =>
      partitionHelperHistory({
        helperId: me.id,
        applications,
        jobs,
        upcomingJobs,
      }),
    [me.id, applications, jobs, upcomingJobs],
  );

  useEffect(() => {
    if (partitioned.diagnostics.length === 0) return;
    console.warn('[LinkHelp] helper history unknown statuses', partitioned.diagnostics);
  }, [partitioned.diagnostics]);

  const pendingReviewIds = useMemo(
    () => new Set(pendingServiceReviews.map((p) => p.requestId)),
    [pendingServiceReviews],
  );

  const toggleAppAccordion = (appId: string, panel: Exclude<HelperTaskAccordion, null>) => {
    setAppAccordion((prev) => ({
      ...prev,
      [appId]: toggleHelperTaskAccordion(prev[appId] ?? null, panel),
    }));
  };

  const goBackToProfile = () => {
    navigate(ROUTES.profile);
  };

  return (
    <AppPageShell className="w-full">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 overflow-x-hidden px-1 pb-28 md:pb-10">
        <DesktopBackButton to={ROUTES.profile} />
        <button
          type="button"
          onClick={goBackToProfile}
          className="flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-900 lg:hidden"
          data-testid="helper-history-back"
        >
          <Icons.ArrowLeft className="h-4 w-4" />
          {t('nav.back')}
        </button>

        <header>
          <h1 className="text-2xl font-black tracking-tight text-slate-950">
            {t('profile_page.history_title')}
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            {t('profile_page.shortcut_history_desc')}
          </p>
        </header>

        <div
          className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm"
          data-testid="helper-history-page"
        >
          <div className="flex border-b border-gray-100" data-testid="helper-history-tabs">
            {(
              [
                { id: 'applications' as const, labelKey: 'profile_page.history_tab_applications' },
                { id: 'completed' as const, labelKey: 'profile_page.history_tab_completed' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                data-testid={`helper-history-tab-${tab.id}`}
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
              partitioned.applicationHistory.length === 0 ? (
                <div className="px-4 py-16 text-center" data-testid="helper-history-empty-applications">
                  <Icons.ClipboardList className="mx-auto mb-4 h-14 w-14 text-gray-200" />
                  <p className="font-semibold text-gray-600">
                    {t('upcoming_jobs.empty_closed_applications')}
                  </p>
                </div>
              ) : (
                partitioned.applicationHistory.map((app) => {
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
                      historyMode
                      expandedAccordion={appAccordion[key] ?? null}
                      onToggleAccordion={(panel) => toggleAppAccordion(app.id, panel)}
                    />
                  );
                })
              )
            ) : partitioned.completedServices.length === 0 ? (
              <div className="px-4 py-16 text-center" data-testid="helper-history-empty-completed">
                <Icons.CalendarOff className="mx-auto mb-4 h-14 w-14 text-gray-200" />
                <p className="font-semibold text-gray-600">{t('upcoming_jobs.empty_completed_title')}</p>
              </div>
            ) : (
              partitioned.completedServices.map((job) => {
                const requestJob = jobs.find((j) => j.id === job.jobId);
                return (
                  <HelperCompletedHistoryCard
                    key={job.id}
                    job={job}
                    requestJob={requestJob}
                    locale={locale}
                    language={language}
                    t={t}
                    reviews={reviews}
                    reviewerId={me.id}
                    pendingRequestIds={pendingReviewIds}
                    onRate={() => openReviewByRequestId(job.jobId)}
                    onViewSubmittedReview={() => openSubmittedReviewByRequestId(job.jobId)}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>
    </AppPageShell>
  );
}
