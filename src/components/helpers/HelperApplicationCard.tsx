import * as Icons from 'lucide-react';
import { clsx } from 'clsx';
import type { Application } from '@/types/application';
import type { Job } from '@/types/job';
import { translateJobTitle, resolveCategoryId } from '@/utils/translateCategory';
import { getCategoryFeedTheme } from '@/utils/categoryFeedTheme';
import { getCategoryIconById } from '@/utils/categoryIcons';
import { formatJobOpenedAt } from '@/utils/jobDisplay';
import { formatJobBudgetAmount } from '@/utils/formatJobBudget';
import { formatMoneyAmount } from '@/utils/jobProposal';
import { isJobPaused } from '@/utils/jobVisibility';
import { LhCard } from '@/components/design-system/LhCard';
import { LhCardOverlay } from '@/components/design-system/LhCardOverlay';
import { InterestedRing } from '@/components/opportunities/InterestedRing';
import { CandidateClientProfileExpand } from '@/components/helpers/CandidateClientProfileExpand';
import { formatLinkCredits } from '@/utils/formatLinkCredits';
import { formatJobScheduleDisplay } from '@/utils/jobDisplay';
import { getRequestDescriptionForViewer } from '@/utils/requestDescriptionDisplay';
import type { AppLanguage } from '@/services/translationService';
import {
  clientFirstName,
  clientInitials,
  type HelperTaskAccordion,
  resolveApplicationDebitedLc,
  resolveVipRefundLc,
} from '@/utils/helperTaskCard';

type Props = {
  app: Application;
  job: Job;
  t: (key: string, vars?: Record<string, string | number>) => string;
  language?: AppLanguage;
  distanceKm?: number | null;
  expandedAccordion: HelperTaskAccordion;
  onToggleAccordion: (panel: Exclude<HelperTaskAccordion, null>) => void;
  onCancel?: () => void;
  onOpenChat?: () => void;
};

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  viewed: 'bg-blue-50 text-blue-700 border-blue-200',
  rejected: 'bg-red-50 text-red-600 border-red-200',
  cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
};

const accordionBtn =
  'inline-flex min-h-[40px] min-w-0 flex-1 items-center justify-center gap-1 rounded-[14px] border px-2 py-2 text-[11px] font-bold leading-tight transition-all sm:min-h-[44px] sm:text-[12px]';

export function HelperApplicationCard({
  app,
  job,
  t,
  language = 'pt',
  distanceKm,
  expandedAccordion,
  onToggleAccordion,
  onCancel,
  onOpenChat,
}: Props) {
  const catId = resolveCategoryId(job.category) ?? 'other';
  const categoryTheme = getCategoryFeedTheme(job.category);
  const CategoryIcon = getCategoryIconById(catId);
  const title = translateJobTitle(job.title, job.category, job.subcategory, t);
  const budgetAmount = formatJobBudgetAmount(job, t);
  const budgetNotInformed = budgetAmount === t('jobs.budget_not_informed');
  const openedLabel = formatJobOpenedAt(job.createdAt, t);
  const applicationsCount = job.applicantCount ?? 0;

  const statusText: Record<string, string> = {
    pending: t('helper_dashboard.app_pending'),
    viewed: t('helper_dashboard.app_viewed'),
    rejected: t('helper_dashboard.app_rejected'),
    cancelled: t('helper_dashboard.app_cancelled'),
  };

  const proposedLabel =
    app.proposedAmount != null && app.proposedAmount > 0
      ? formatMoneyAmount(app.proposedAmount, job.currency)
      : null;

  const canCancel = (app.status === 'pending' || app.status === 'viewed') && !!onCancel;
  const canChat = !!app.chatUnlocked && !!onOpenChat;
  const debitedLc = resolveApplicationDebitedLc(job, app, distanceKm);
  const refundLc = resolveVipRefundLc(debitedLc, app);
  const scheduleLabel = formatJobScheduleDisplay(job, t);
  const descriptionView = getRequestDescriptionForViewer(job.description, language);
  const firstName = clientFirstName(job.clientName);
  const profileOpen = expandedAccordion === 'client';
  const descriptionOpen = expandedAccordion === 'description';

  const distanceLabel =
    distanceKm != null && Number.isFinite(distanceKm)
      ? t('helper_tasks.distance_km', { km: distanceKm.toFixed(1) })
      : job.location?.trim()
        ? job.location.split(',').slice(0, 2).join(',').trim()
        : t('jobs.remote');

  return (
    <>
    <LhCard
      padding="none"
      className={clsx(
        'group/card relative h-full w-full max-w-full overflow-hidden rounded-[22px] border border-[rgba(15,23,42,0.08)] bg-white',
        'shadow-[0_2px_12px_rgba(15,23,42,0.05),0_6px_28px_rgba(15,23,42,0.06)]',
      )}
    >
      <div
        className="h-[4px] w-full shrink-0 rounded-t-[22px]"
        style={{
          background: `linear-gradient(90deg, ${categoryTheme.iconColor} 0%, ${categoryTheme.iconColor}55 55%, transparent 100%)`,
        }}
        aria-hidden
      />

      <div className="relative bg-white px-3 pb-3 pt-3 sm:px-4 sm:pb-4 sm:pt-4">
        <div className="grid w-full min-w-0 grid-cols-[52px_minmax(0,1fr)_64px] gap-x-2 gap-y-1.5 sm:grid-cols-[64px_minmax(0,1fr)_72px] sm:gap-x-3">
          <div
            className="col-start-1 row-start-1 row-span-2 flex h-[52px] w-[52px] items-center justify-center self-start rounded-xl border sm:h-16 sm:w-16 sm:rounded-[18px]"
            style={{
              backgroundColor: categoryTheme.iconBg,
              borderColor: `${categoryTheme.iconColor}28`,
              boxShadow: `0 6px 18px ${categoryTheme.iconColor}18`,
            }}
          >
            <CategoryIcon
              className="h-6 w-6 sm:h-7 sm:w-7"
              style={{ color: categoryTheme.iconColor }}
              strokeWidth={1.9}
              aria-hidden
            />
          </div>

          <div className="col-start-2 row-start-1 min-w-0">
            <div className="flex min-w-0 flex-wrap items-start gap-x-2 gap-y-1">
              <h3 className="min-w-0 flex-1 text-[15px] font-bold leading-snug text-[#0F172A] sm:text-[17px]">
                {title}
              </h3>
              {isJobPaused(job) ? (
                <span className="flex shrink-0 items-center gap-0.5 rounded-md border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-[10px] font-black text-slate-700">
                  <Icons.Pause className="h-2.5 w-2.5" />
                  {t('helper_dashboard.request_paused_badge')}
                </span>
              ) : null}
            </div>
          </div>

          <div className="col-start-3 row-start-1 flex flex-col items-center gap-1.5">
            <span
              className={clsx(
                'rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide',
                STATUS_BADGE[app.status] ?? 'border-slate-200 bg-slate-50 text-slate-500',
              )}
            >
              {statusText[app.status] ?? t('common.unknown')}
            </span>
            {app.isExclusive ? (
              <span className="rounded-md border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[9px] font-black text-amber-700">
                VIP
              </span>
            ) : null}
          </div>

          <div className="col-start-2 row-start-2 min-w-0 space-y-1">
            <div className="flex min-w-0 items-center gap-1.5" style={{ color: categoryTheme.budgetColor }}>
              <Icons.Link2 className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
              <span className="truncate whitespace-nowrap text-[12px] font-bold sm:text-[13px]">
                {budgetNotInformed ? budgetAmount : t('jobs.budget_with_amount', { amount: budgetAmount })}
              </span>
            </div>
            {proposedLabel ? (
              <div className="flex min-w-0 items-center gap-1.5 text-emerald-700">
                <Icons.Banknote className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
                <span className="truncate whitespace-nowrap text-[12px] font-bold sm:text-[13px]">
                  {t('helper_dashboard.app_your_proposal', { amount: proposedLabel })}
                </span>
              </div>
            ) : null}
            {openedLabel ? (
              <div className="flex min-w-0 items-center gap-1.5 text-[#94A3B8]">
                <Icons.Calendar className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
                <span className="truncate whitespace-nowrap text-[11px] font-medium sm:text-[12px]">{openedLabel}</span>
              </div>
            ) : null}
          </div>

          <div className="col-start-3 row-start-2 flex shrink-0 flex-col items-center justify-center self-center">
            <InterestedRing
              interestedCount={applicationsCount}
              label={t('helper_dashboard.interested_ring_label')}
              size={60}
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-stretch gap-2 border-t border-[rgba(15,23,42,0.06)] pt-3">
          <button
            type="button"
            onClick={() => onToggleAccordion('client')}
            aria-expanded={profileOpen}
            data-testid="helper-application-open-profile"
            className={clsx(
              accordionBtn,
              profileOpen
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50',
            )}
          >
            {job.clientAvatar && !job.clientAvatar.includes('pravatar') ? (
              <img src={job.clientAvatar} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />
            ) : (
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                style={{ backgroundColor: categoryTheme.iconBg, color: categoryTheme.iconColor }}
              >
                {clientInitials(job.clientName)}
              </span>
            )}
            <span className="truncate">{firstName}</span>
            <Icons.ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
          </button>

          <button
            type="button"
            onClick={() => onToggleAccordion('description')}
            aria-expanded={descriptionOpen}
            data-testid="helper-application-open-description"
            className={clsx(
              accordionBtn,
              'max-w-[38%] sm:max-w-none',
              descriptionOpen
                ? 'border-blue-300 bg-blue-50 text-blue-800'
                : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50',
            )}
          >
            <span>{t('helper_tasks.description_toggle')}</span>
            <Icons.ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
          </button>

          {canCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className={clsx(
                accordionBtn,
                'border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
              )}
            >
              {t('helper_tasks.cancel_short')}
            </button>
          ) : canChat ? (
            <button
              type="button"
              onClick={onOpenChat}
              className={clsx(accordionBtn, 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100')}
            >
              <Icons.MessageSquare className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden xs:inline sm:inline">{t('upcoming_jobs.open_chat')}</span>
            </button>
          ) : null}
        </div>
      </div>
    </LhCard>

      <LhCardOverlay
        open={profileOpen && Boolean(job.clientId)}
        onClose={() => onToggleAccordion('client')}
        title={t('helper_dashboard.feed_card_profile_title')}
        subtitle={job.clientName}
        testId="helper-application-profile-overlay"
      >
        {job.clientId ? <CandidateClientProfileExpand clientId={job.clientId} className="border-0 bg-transparent px-0" /> : null}
      </LhCardOverlay>

      <LhCardOverlay
        open={descriptionOpen}
        onClose={() => onToggleAccordion('description')}
        title={t('helper_tasks.description_toggle')}
        subtitle={title}
        testId="helper-application-description-overlay"
      >
        <div data-testid="helper-application-description-view">
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
            {t('helper_tasks.observations_label')}
          </p>
          <p className="mt-2 min-h-[72px] whitespace-pre-wrap text-[13px] font-medium leading-relaxed text-slate-800">
            {descriptionView.display || t('upcoming_jobs.no_observations')}
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-700">
            <div className="rounded-xl border border-slate-100 bg-white px-2.5 py-2">
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                {t('upcoming_jobs.date_time')}
              </p>
              <p className="mt-1 leading-snug">{scheduleLabel || '—'}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-white px-2.5 py-2">
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                {t('helper_tasks.distance_label')}
              </p>
              <p className="mt-1 truncate leading-snug">{distanceLabel}</p>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-700">
            <div className="rounded-xl border border-slate-100 bg-white px-2.5 py-2">
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                {t('helper_tasks.lc_debited_label')}
              </p>
              <p className="mt-1 tabular-nums text-emerald-700">{formatLinkCredits(debitedLc)} LC</p>
              <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
                {app.isExclusive ? t('helper_tasks.application_type_vip') : t('helper_tasks.application_type_normal')}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-white px-2.5 py-2">
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                {t('upcoming_jobs.status_label')}
              </p>
              <p className="mt-1">{statusText[app.status] ?? t('common.unknown')}</p>
            </div>
          </div>

          {refundLc != null && refundLc > 0 ? (
            <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-[11px] font-semibold text-emerald-800">
              {t('helper_tasks.vip_refund_note', { count: formatLinkCredits(refundLc) })}
            </p>
          ) : null}
        </div>
      </LhCardOverlay>
    </>
  );
}
