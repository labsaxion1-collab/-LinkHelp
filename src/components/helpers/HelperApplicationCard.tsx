import { useEffect, useRef, useState } from 'react';
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
  clientInitials,
  type HelperTaskAccordion,
  resolveApplicationDebitedLc,
  resolveVipRefundLc,
} from '@/utils/helperTaskCard';
import {
  FEED_CARD_CONTENT_CLASS,
  FEED_CARD_FIXED_HEIGHT_EXTRA_PX,
  FEED_CARD_RING_SIZE_PX,
  FEED_CARD_SHELL_CLASS,
  FEED_CARD_STANDARD_CONTENT_HEIGHT_PX,
  FEED_CARD_TOP_ACCENT_CLASS,
  feedCardMinContentStyle,
} from '@/utils/feedCardFixedHeight';

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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
  const isRejected = app.status === 'rejected';
  const debitedLc = resolveApplicationDebitedLc(job, app, distanceKm);
  const refundLc = resolveVipRefundLc(debitedLc, app);
  const scheduleLabel = formatJobScheduleDisplay(job, t);
  const descriptionView = getRequestDescriptionForViewer(job.description, language);
  const clientName = job.clientName?.trim() || '?';
  const profileOpen = expandedAccordion === 'client';
  const descriptionOpen = expandedAccordion === 'description';

  const distanceLabel =
    distanceKm != null && Number.isFinite(distanceKm)
      ? t('helper_tasks.distance_km', { km: distanceKm.toFixed(1) })
      : job.location?.trim()
        ? job.location.split(',').slice(0, 2).join(',').trim()
        : t('jobs.remote');

  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!canCancel) setMenuOpen(false);
  }, [canCancel]);

  return (
    <>
      <LhCard
        padding="none"
        className={FEED_CARD_SHELL_CLASS}
        data-testid="helper-application-card"
        data-app-status={app.status}
        data-feed-card-min-height={FEED_CARD_STANDARD_CONTENT_HEIGHT_PX}
        data-feed-card-height-extra={FEED_CARD_FIXED_HEIGHT_EXTRA_PX}
      >
        <div
          className={FEED_CARD_TOP_ACCENT_CLASS}
          style={{
            background: `linear-gradient(90deg, ${categoryTheme.iconColor} 0%, ${categoryTheme.iconColor}55 55%, transparent 100%)`,
          }}
          aria-hidden
        />

        <div className={FEED_CARD_CONTENT_CLASS} style={feedCardMinContentStyle()}>
          <div className="grid w-full min-w-0 grid-cols-[48px_minmax(0,1fr)_68px] grid-rows-[auto_auto_auto] gap-x-2 gap-y-1 sm:grid-cols-[56px_minmax(0,1fr)_68px] sm:gap-x-2.5">
            <div
              className="col-start-1 row-start-1 row-span-2 flex h-[48px] w-[48px] items-center justify-center self-start rounded-xl border sm:h-[52px] sm:w-[52px] sm:rounded-[16px]"
              style={{
                backgroundColor: categoryTheme.iconBg,
                borderColor: `${categoryTheme.iconColor}28`,
                boxShadow: `0 5px 14px ${categoryTheme.iconColor}16`,
              }}
            >
              <CategoryIcon
                className="h-[22px] w-[22px] sm:h-6 sm:w-6"
                style={{ color: categoryTheme.iconColor }}
                strokeWidth={1.9}
                aria-hidden
              />
            </div>

            <div className="col-start-2 row-start-1 min-w-0 pr-0.5">
              <div className="flex min-w-0 items-start gap-1.5">
                <h3 className="min-w-0 flex-1 line-clamp-2 text-[15px] font-bold leading-[1.28] text-[#0F172A] sm:text-[17px] sm:leading-[1.3]">
                  {title}
                </h3>
                {isJobPaused(job) ? (
                  <span className="mt-0.5 flex shrink-0 items-center gap-0.5 rounded-md border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-[10px] font-black text-slate-700">
                    <Icons.Pause className="h-2.5 w-2.5" />
                    {t('helper_dashboard.request_paused_badge')}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="col-start-3 row-start-1 flex shrink-0 flex-col items-end gap-1">
              <div className="flex items-start gap-0.5">
                <span
                  data-testid="helper-application-status"
                  className={clsx(
                    'max-w-[4.75rem] truncate rounded-md border px-1.5 py-0.5 text-center text-[9px] font-bold uppercase tracking-wide',
                    STATUS_BADGE[app.status] ?? 'border-slate-200 bg-slate-50 text-slate-500',
                  )}
                >
                  {statusText[app.status] ?? t('common.unknown')}
                </span>
                {canCancel ? (
                  <div ref={menuRef} className="relative shrink-0" data-testid="helper-application-menu-anchor">
                    <button
                      type="button"
                      data-testid="helper-application-more-menu"
                      aria-label={t('common.more_options')}
                      aria-expanded={menuOpen}
                      aria-haspopup="menu"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen((open) => !open);
                      }}
                      className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
                    >
                      <Icons.MoreVertical className="h-4 w-4" aria-hidden />
                    </button>
                    {menuOpen ? (
                      <div
                        role="menu"
                        data-testid="helper-application-more-menu-panel"
                        className="absolute right-0 top-full z-40 mt-1 min-w-[11.5rem] overflow-hidden rounded-xl border border-slate-100 bg-white py-1 shadow-[0_12px_32px_rgba(15,23,42,0.14)]"
                      >
                        <button
                          type="button"
                          role="menuitem"
                          data-testid="helper-application-cancel-menu-item"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen(false);
                            onCancel?.();
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-bold text-red-700 hover:bg-red-50"
                        >
                          <Icons.Ban className="h-4 w-4 shrink-0" aria-hidden />
                          {t('helper_dashboard.cancel_application')}
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
              {app.isExclusive ? (
                <span className="rounded-md border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[9px] font-black text-amber-700">
                  VIP
                </span>
              ) : null}
            </div>

            <div className="col-start-2 row-start-2 min-w-0 self-start space-y-0.5">
              <div
                className="flex min-w-0 items-center gap-1.5 text-[12px] font-bold sm:text-[12px]"
                style={{ color: categoryTheme.budgetColor }}
              >
                <Icons.Link2 className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
                <span className="truncate whitespace-nowrap">
                  {budgetNotInformed
                    ? budgetAmount
                    : t('jobs.budget_with_amount', { amount: budgetAmount })}
                </span>
              </div>
              {proposedLabel ? (
                <div className="flex min-w-0 items-center gap-1.5 text-[11px] font-bold text-emerald-700">
                  <Icons.Banknote className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
                  <span className="truncate whitespace-nowrap">
                    {t('helper_dashboard.app_your_proposal', { amount: proposedLabel })}
                  </span>
                </div>
              ) : null}
              {openedLabel ? (
                <div className="flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-[#94A3B8]">
                  <Icons.Calendar className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
                  <span className="truncate whitespace-nowrap">{openedLabel}</span>
                </div>
              ) : null}
            </div>

            <div className="col-start-3 row-start-2 flex shrink-0 items-center justify-center self-center pt-0.5">
              <InterestedRing
                interestedCount={applicationsCount}
                label={t('helper_dashboard.interested_ring_label')}
                size={FEED_CARD_RING_SIZE_PX}
              />
            </div>

            {isRejected ? (
              <div
                className="col-span-3 col-start-1 mt-1 rounded-xl border border-rose-100 bg-rose-50/90 px-2.5 py-2"
                data-testid="helper-application-rejected-banner"
              >
                <div className="flex items-start gap-2">
                  <Icons.Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold leading-snug text-rose-800">
                      {t('helper_tasks.rejected_banner_title')}
                    </p>
                    <p className="mt-0.5 text-[10px] font-semibold leading-snug text-rose-700/90">
                      {t('helper_tasks.rejected_banner_body')}
                    </p>
                    <p className="mt-0.5 text-[10px] font-semibold leading-snug text-rose-600/85">
                      {t('helper_tasks.rejected_banner_no_extra_charge')}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="relative col-span-3 col-start-1 mt-0.5 flex flex-col gap-1.5 border-t border-[rgba(15,23,42,0.06)] pt-2">
              <div className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  data-testid="helper-application-open-profile"
                  onClick={() => onToggleAccordion('client')}
                  aria-expanded={profileOpen}
                  aria-label={t('helper_public.view_profile')}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-full py-0.5 pr-1 text-left transition hover:opacity-90"
                >
                  {job.clientAvatar && !job.clientAvatar.includes('pravatar') ? (
                    <img
                      src={job.clientAvatar}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-full object-cover shadow-sm ring-2 ring-white"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-sm ring-2 ring-white"
                      style={{
                        backgroundColor: categoryTheme.iconBg,
                        color: categoryTheme.iconColor,
                      }}
                    >
                      {clientInitials(job.clientName)}
                    </span>
                  )}
                  <span className="min-w-0 truncate text-[12px] font-bold text-[#475569]">
                    {clientName}
                  </span>
                </button>
                <button
                  type="button"
                  data-testid="helper-application-open-description"
                  onClick={() => onToggleAccordion('description')}
                  aria-expanded={descriptionOpen}
                  className="inline-flex min-h-[44px] w-[7.75rem] shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[rgba(15,23,42,0.08)] bg-[#f8fafc] px-2.5 py-2 text-[12px] font-bold text-[#0F172A] transition hover:bg-slate-50 sm:w-[8.5rem]"
                >
                  <Icons.FileText className="h-3.5 w-3.5 shrink-0 text-[#64748B]" aria-hidden />
                  <span className="truncate">{t('helper_tasks.description_toggle')}</span>
                  <Icons.ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#64748B]" aria-hidden />
                </button>
              </div>

              {canChat ? (
                <button
                  type="button"
                  onClick={onOpenChat}
                  data-testid="helper-application-open-chat"
                  className="inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 text-[12px] font-bold text-blue-700 hover:bg-blue-100"
                >
                  <Icons.MessageSquare className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {t('upcoming_jobs.open_chat')}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </LhCard>

      <LhCardOverlay
        open={profileOpen && Boolean(job.clientId)}
        onClose={() => onToggleAccordion('client')}
        title={t('helper_dashboard.feed_card_profile_title')}
        subtitle={clientName}
        testId="helper-application-profile-overlay"
      >
        {job.clientId ? (
          <CandidateClientProfileExpand clientId={job.clientId} className="border-0 bg-transparent px-0" />
        ) : null}
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
                {app.isExclusive
                  ? t('helper_tasks.application_type_vip')
                  : t('helper_tasks.application_type_normal')}
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
