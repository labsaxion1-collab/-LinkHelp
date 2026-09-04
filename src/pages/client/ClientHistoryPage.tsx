import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { clsx } from 'clsx';
import { AppPageShell } from '@/components/design-system/AppPageShell';
import { DesktopBackButton } from '@/components/layout/DesktopBackButton';
import { ClientCompletedHistoryCard } from '@/components/client/ClientCompletedHistoryCard';
import { ClientHistoryClosedCard } from '@/components/client/ClientHistoryClosedCard';
import { useSessionViewer } from '@/hooks/useSessionViewer';
import { useLanguage } from '@/context/LanguageContext';
import { useServiceReview } from '@/context/ServiceReviewContext';
import { useAppData } from '@/context/AppDataContext';
import { ROUTES } from '@/utils/constants';
import { partitionClientRequests } from '@/utils/clientHistoryBuckets';
import { findHiredApplicationForJob } from '@/utils/clientActivityApplications';
import { formatMoneyAmount } from '@/utils/jobProposal';

type HistoryTab = 'closed' | 'completed';

export default function ClientHistoryPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { openReviewByRequestId, openSubmittedReviewByRequestId } = useServiceReview();
  const { jobs, upcomingJobs, applications, reviews, pendingServiceReviews } = useAppData();
  const me = useSessionViewer();
  const locale = language === 'fr' ? 'fr-CA' : language === 'pt' ? 'pt-BR' : 'en-CA';

  const [activeTab, setActiveTab] = useState<HistoryTab>(() => {
    const st = location.state as { historyTab?: HistoryTab } | null;
    return st?.historyTab === 'completed' ? 'completed' : 'closed';
  });

  useEffect(() => {
    const st = location.state as { historyTab?: HistoryTab } | null;
    if (st?.historyTab === 'completed' || st?.historyTab === 'closed') {
      setActiveTab(st.historyTab);
    }
  }, [location.state]);

  const partitioned = useMemo(
    () =>
      partitionClientRequests({
        jobs,
        clientId: me.id,
      }),
    [jobs, me.id],
  );

  useEffect(() => {
    if (partitioned.diagnostics.length === 0) return;
    console.warn('[LinkHelp] client history unknown statuses', partitioned.diagnostics);
  }, [partitioned.diagnostics]);

  const pendingReviewIds = useMemo(
    () => new Set(pendingServiceReviews.map((p) => p.requestId)),
    [pendingServiceReviews],
  );

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
          data-testid="client-history-back"
        >
          <Icons.ArrowLeft className="h-4 w-4" />
          {t('nav.back')}
        </button>

        <header>
          <h1 className="text-2xl font-black tracking-tight text-slate-950">
            {t('profile_page.history_title')}
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            {t('profile_page.shortcut_client_history_desc')}
          </p>
        </header>

        <div
          className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm"
          data-testid="client-history-page"
        >
          <div className="flex border-b border-gray-100" data-testid="client-history-tabs">
            {(
              [
                {
                  id: 'closed' as const,
                  label: t('client_history.closed_tab'),
                  count: partitioned.closed.length,
                },
                {
                  id: 'completed' as const,
                  label: t('client_history.completed_tab'),
                  count: partitioned.completed.length,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'flex flex-1 items-center justify-center gap-2 px-3 py-3.5 text-sm font-black transition',
                  activeTab === tab.id
                    ? 'border-b-2 border-slate-950 text-slate-950'
                    : 'text-slate-400 hover:text-slate-700',
                )}
                data-testid={`client-history-tab-${tab.id}`}
              >
                {tab.label}
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="space-y-4 p-4 sm:p-5">
            {activeTab === 'closed' ? (
              partitioned.closed.length === 0 ? (
                <p className="py-10 text-center text-sm font-semibold text-slate-500" data-testid="client-history-empty-closed">
                  {t('client_history.empty_closed')}
                </p>
              ) : (
                partitioned.closed.map((job) => (
                  <ClientHistoryClosedCard
                    key={job.id}
                    job={job}
                    t={t}
                    hiredApplication={findHiredApplicationForJob(job, applications, upcomingJobs)}
                  />
                ))
              )
            ) : partitioned.completed.length === 0 ? (
              <p className="py-10 text-center text-sm font-semibold text-slate-500" data-testid="client-history-empty-completed">
                {t('client_history.empty_completed')}
              </p>
            ) : (
              partitioned.completed.map((job) => {
                const hiredApplication = findHiredApplicationForJob(job, applications, upcomingJobs);
                const upcoming = upcomingJobs.find((u) => u.jobId === job.id);
                return (
                  <ClientCompletedHistoryCard
                    key={job.id}
                    job={job}
                    hiredApplication={hiredApplication}
                    upcoming={upcoming}
                    reviews={reviews}
                    reviewerId={me.id}
                    pendingRequestIds={pendingReviewIds}
                    t={t}
                    formatMoneyAmount={formatMoneyAmount}
                    locale={locale}
                    onRate={() => openReviewByRequestId(job.id)}
                    onViewSubmittedReview={() => openSubmittedReviewByRequestId(job.id)}
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
