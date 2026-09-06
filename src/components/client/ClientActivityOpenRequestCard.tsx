import React, { useEffect, useRef, useState } from 'react';
import * as Icons from 'lucide-react';
import { clsx } from 'clsx';
import type { Application } from '@/types/application';
import type { Job } from '@/types/job';
import { ClientActivityCandidateRing } from '@/components/client/ClientActivityCandidateRing';
import { ClientActivityCandidateRow } from '@/components/client/ClientActivityCandidateRow';
import { CandidateHelperProfileExpand } from '@/components/client/CandidateHelperProfileExpand';
import { LinkHelpRankBadgeFromStats } from '@/components/ranking/LinkHelpRankBadge';
import { LhCard } from '@/components/design-system/LhCard';
import { LhCardOverlay } from '@/components/design-system/LhCardOverlay';
import {
  FEED_CARD_PREMIUM_BODY_CLASS,
  FEED_CARD_PREMIUM_EYEBROW_CLASS,
  FEED_CARD_PREMIUM_MUTED_CLASS,
  FEED_CARD_PREMIUM_SCROLL_CLASS,
  FEED_CARD_PREMIUM_SHELL_CLASS,
  FEED_CARD_PREMIUM_SURFACE_CLASS,
  FEED_CARD_PREMIUM_TITLE_CLASS,
} from '@/components/opportunities/feedCardPremiumTheme';
import { getCategoryIconById } from '@/utils/categoryIcons';
import { getCategoryFeedTheme } from '@/utils/categoryFeedTheme';
import { formatJobBudgetAmount } from '@/utils/formatJobBudget';
import { formatJobScheduleDisplay } from '@/utils/jobDisplay';
import { isJobPaused } from '@/utils/jobVisibility';
import { translateCategory, translateJobTitle } from '@/utils/translateCategory';
import {
  activityCandidateCount,
  canAcceptApplicationForJob,
  isHireTeamComplete,
} from '@/utils/clientActivityApplications';
import {
  candidateRingSegmentColors,
  firstNameFromHelperName,
  rankAccentForApplication,
  resolveExclusiveCandidate,
} from '@/utils/clientActivityCandidateRing';
import {
  ACTIVITY_APPLICATION_CARD_MIN_CONTENT_HEIGHT_PX,
  FEED_CARD_CONTENT_CLASS,
  FEED_CARD_FIXED_HEIGHT_EXTRA_PX,
  FEED_CARD_SHELL_CLASS,
  FEED_CARD_TOP_ACCENT_CLASS,
  activityApplicationCardMinContentStyle,
} from '@/utils/feedCardFixedHeight';

/** Bottom-row ring — slightly smaller so arc + Description share one footer line. */
const BOTTOM_RING_SIZE_PX = 52;

type ActivityOverlay = 'description' | 'candidates' | 'profile' | null;

type TFn = (key: string, options?: Record<string, string | number>) => string;

export type ClientActivityOpenRequestCardProps = {
  job: Job;
  candidateApps: Application[];
  applications: Application[];
  isExclusiveLocked: boolean;
  t: TFn;
  formatMoneyAmount: (amount: number, currency: string) => string;
  acceptingApplicationId: string | null;
  onAccept: (app: Application) => void;
  onReject: (app: Application) => Promise<void> | void;
  showLifecycleMenu: boolean;
  cancelEnabled: boolean;
  activityMenuOpen: boolean;
  onToggleActivityMenu: () => void;
  activityMenuRef?: React.Ref<HTMLDivElement>;
  onCancel: () => void;
};

export function ClientActivityOpenRequestCard({
  job,
  candidateApps,
  applications,
  isExclusiveLocked,
  t,
  formatMoneyAmount,
  acceptingApplicationId,
  onAccept,
  onReject,
  showLifecycleMenu: _showLifecycleMenu,
  cancelEnabled,
  activityMenuOpen,
  onToggleActivityMenu,
  activityMenuRef,
  onCancel,
}: ClientActivityOpenRequestCardProps) {
  const [overlay, setOverlay] = useState<ActivityOverlay>(null);
  const [profileAppId, setProfileAppId] = useState<string | null>(null);
  const [rejectingApplicationId, setRejectingApplicationId] = useState<string | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const cardShellRef = useRef<HTMLDivElement | null>(null);

  const CategoryIcon = getCategoryIconById(job.category);
  const categoryTheme = getCategoryFeedTheme(job.category);
  const title = translateJobTitle(job.title, job.category, job.subcategory, t);
  const category = translateCategory(job.category, t);
  const displayCandidates = candidateApps.slice(0, 3);
  const candidateCount = activityCandidateCount(candidateApps);
  const teamComplete = isHireTeamComplete(job.id, applications);
  const exclusiveApp = resolveExclusiveCandidate(displayCandidates, isExclusiveLocked);
  const segmentColors = candidateRingSegmentColors(displayCandidates);
  const exclusiveFullColor = exclusiveApp ? rankAccentForApplication(exclusiveApp) : null;
  const profileApp = profileAppId
    ? displayCandidates.find((a) => a.id === profileAppId) ?? null
    : null;
  const schedule = formatJobScheduleDisplay(job, t);
  const budgetAmount = formatJobBudgetAmount(job, t);
  const locationLabel =
    job.serviceMode === 'remote'
      ? t('create_modal.service_mode_remote')
      : job.address || job.city || job.location || null;

  useEffect(() => {
    if (!activityMenuOpen || !cardShellRef.current) return;

    const node = cardShellRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry && !entry.isIntersecting) {
          onToggleActivityMenu();
        }
      },
      { threshold: 0.15, rootMargin: '0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [activityMenuOpen, onToggleActivityMenu]);

  const closeOverlay = () => {
    setOverlay(null);
    setProfileAppId(null);
  };

  const openCandidatesPanel = () => {
    setOverlay('candidates');
  };

  const openProfile = (appId: string) => {
    setProfileAppId(appId);
    setOverlay('profile');
  };

  const backFromProfile = () => {
    setOverlay('candidates');
  };

  const tryAccept = (app: Application) => {
    if (
      !canAcceptApplicationForJob({
        jobStatus: job.status,
        application: app,
        applications,
        acceptingApplicationId,
      })
    ) {
      return;
    }
    if (app.isExclusive && typeof window !== 'undefined') {
      const name = firstNameFromHelperName(app.helperName) || app.helperName;
      const amount =
        app.proposedAmount != null
          ? formatMoneyAmount(app.proposedAmount, job.currency || 'CAD')
          : t('client_dashboard.helper_proposal_negotiable_short');
      if (!window.confirm(t('client_dashboard.accept_confirm_hire', { name, amount }))) {
        return;
      }
    }
    onAccept(app);
  };

  const tryReject = async (app: Application) => {
    if (rejectingApplicationId || acceptingApplicationId) return;
    const confirmKey = app.isExclusive
      ? 'client_dashboard.reject_confirm_vip'
      : 'client_dashboard.reject_confirm';
    if (typeof window !== 'undefined' && !window.confirm(t(confirmKey))) return;
    setRejectingApplicationId(app.id);
    try {
      await onReject(app);
    } finally {
      setRejectingApplicationId(null);
    }
  };

  const ringAriaLabel =
    exclusiveApp != null
      ? t('client_dashboard.open_vip_candidate_a11y')
      : candidateCount <= 0
        ? t('client_dashboard.open_candidates_a11y_zero')
        : t('client_dashboard.open_candidates_a11y', { count: candidateCount });

  const statusPill = isExclusiveLocked ? (
    <span className="inline-flex max-w-full items-center gap-1 truncate rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-800">
      <Icons.Crown className="h-3 w-3 shrink-0" aria-hidden />
      <span className="truncate">{t('client_dashboard.exclusive_application_badge')}</span>
    </span>
  ) : (
    <span
      className={clsx(
        'inline-flex max-w-full items-center gap-1 truncate rounded-full border px-2 py-0.5 text-[10px] font-black',
        isJobPaused(job)
          ? 'border-slate-200 bg-slate-100 text-slate-700'
          : 'border-sky-200 bg-sky-50 text-sky-800',
      )}
    >
      <Icons.Clock3 className="h-3 w-3 shrink-0" aria-hidden />
      <span className="truncate">
        {isJobPaused(job) ? t('client_dashboard.status_paused') : t('client_dashboard.status_waiting_helpers')}
      </span>
    </span>
  );

  const renderActionRow = (app: Application, extraClassName?: string) => {
    const canAccept = canAcceptApplicationForJob({
      jobStatus: job.status,
      application: app,
      applications,
      acceptingApplicationId,
    });
    return (
      <ClientActivityCandidateRow
        key={app.id}
        job={job}
        app={app}
        t={t}
        formatMoneyAmount={formatMoneyAmount}
        onOpenProfile={() => openProfile(app.id)}
        onAccept={() => tryAccept(app)}
        onReject={() => void tryReject(app)}
        accepting={acceptingApplicationId === app.id}
        rejecting={rejectingApplicationId === app.id}
        acceptDisabled={
          !canAccept || (acceptingApplicationId != null && acceptingApplicationId !== app.id)
        }
        rejectDisabled={rejectingApplicationId != null && rejectingApplicationId !== app.id}
        teamComplete={teamComplete}
        className={extraClassName}
      />
    );
  };

  const renderAnchoredMenu = () => {
    if (!activityMenuOpen) return null;
    return (
      <div
        data-testid="client-activity-card-menu"
        className="absolute right-0 top-full z-[60] mt-1 min-w-[12rem] overflow-hidden rounded-xl border border-slate-100 bg-white py-1 shadow-[0_12px_32px_rgba(15,23,42,0.14)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {cancelEnabled ? (
          <button
            type="button"
            data-testid="client-activity-cancel-request"
            onClick={onCancel}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-bold text-amber-800 hover:bg-amber-50"
          >
            <Icons.Ban className="h-4 w-4 text-amber-600" aria-hidden />
            {t('client_dashboard.cancel_request')}
          </button>
        ) : null}
      </div>
    );
  };

  const renderSummary = () => (
    <div
      className="relative z-0 flex min-h-0 flex-col"
      data-testid="client-activity-card-summary"
    >
      <div className="flex shrink-0 items-start gap-2">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border sm:h-11 sm:w-11"
          style={{
            backgroundColor: categoryTheme.iconBg,
            borderColor: `${categoryTheme.iconColor}28`,
            boxShadow: `0 5px 14px ${categoryTheme.iconColor}16`,
          }}
        >
          <CategoryIcon
            className="h-5 w-5"
            style={{ color: categoryTheme.iconColor }}
            strokeWidth={1.9}
            aria-hidden
          />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">{statusPill}</div>
        <div
          ref={activityMenuOpen ? activityMenuRef : undefined}
          className="relative shrink-0"
          data-testid="client-activity-menu-anchor"
        >
          <button
            ref={menuButtonRef}
            type="button"
            data-testid="client-activity-more-menu"
            aria-label={t('common.more_options')}
            aria-expanded={activityMenuOpen}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onToggleActivityMenu();
            }}
            className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
          >
            <Icons.MoreVertical className="h-5 w-5" />
          </button>
          {renderAnchoredMenu()}
        </div>
      </div>

      <div className="mt-1.5 shrink-0 space-y-0.5 overflow-hidden">
        <h3 className="line-clamp-2 text-[15px] font-bold leading-[1.25] text-[#0F172A] sm:text-[16px]">
          {title}
        </h3>
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className="h-[6px] w-[6px] shrink-0 rounded-full"
            style={{ backgroundColor: categoryTheme.dotColor }}
          />
          <span className="truncate text-[11px] font-medium text-[#94A3B8]">{category}</span>
        </div>
        <p
          className="truncate whitespace-nowrap text-[13px] font-black tabular-nums"
          style={{ color: categoryTheme.budgetColor }}
          data-testid="client-activity-summary-budget"
        >
          {budgetAmount}
        </p>
        {schedule ? (
          <p className="truncate text-[11px] font-semibold text-[#64748B]">
            <Icons.Calendar className="mr-1 inline h-3 w-3 align-[-1px] text-[#94A3B8]" aria-hidden />
            {schedule}
          </p>
        ) : null}
        {locationLabel ? (
          <p className="truncate text-[11px] font-semibold text-[#64748B]">
            <Icons.MapPin className="mr-1 inline h-3 w-3 align-[-1px] text-[#94A3B8]" aria-hidden />
            {locationLabel}
          </p>
        ) : null}
      </div>

      <div
        className="mt-auto flex shrink-0 flex-col gap-2 border-t border-[rgba(15,23,42,0.06)] pt-2"
        data-testid="client-activity-summary-footer"
      >
        {candidateCount > 0 ? (
          <button
            type="button"
            data-testid={
              exclusiveApp != null
                ? 'client-activity-view-vip-cta'
                : 'client-activity-choose-help-cta'
            }
            onClick={(e) => {
              e.stopPropagation();
              openCandidatesPanel();
            }}
            className={clsx(
              'relative z-10 inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl px-3 text-[12px] font-black transition',
              exclusiveApp != null
                ? 'border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
                : 'border border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100',
            )}
          >
            {exclusiveApp != null ? (
              <Icons.Crown className="h-3.5 w-3.5 shrink-0" aria-hidden />
            ) : (
              <Icons.Users className="h-3.5 w-3.5 shrink-0" aria-hidden />
            )}
            <span>
              {exclusiveApp != null
                ? t('client_dashboard.view_vip_application_cta')
                : t('client_dashboard.choose_help_cta')}
            </span>
          </button>
        ) : null}
        <div className="flex items-center gap-2">
          <div className="shrink-0" data-testid="client-activity-footer-ring">
            <ClientActivityCandidateRing
              segmentColors={segmentColors}
              exclusiveFullColor={exclusiveFullColor}
              size={BOTTOM_RING_SIZE_PX}
              count={candidateCount}
              ariaLabel={ringAriaLabel}
              onActivate={candidateCount > 0 ? undefined : openCandidatesPanel}
            />
          </div>
          <button
            type="button"
            data-testid="client-activity-open-description"
            onClick={(e) => {
              e.stopPropagation();
              setOverlay('description');
            }}
            className="ml-auto inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[rgba(15,23,42,0.08)] bg-[#f8fafc] px-3 py-2 text-[12px] font-bold text-[#0F172A] transition hover:bg-slate-50"
            aria-expanded={overlay === 'description'}
          >
            <Icons.FileText className="h-3.5 w-3.5 shrink-0 text-[#64748B]" aria-hidden />
            <span>{t('client_dashboard.view_description')}</span>
            <Icons.ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#64748B]" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );

  const renderDescriptionContent = () => (
    <div
      className={clsx(FEED_CARD_PREMIUM_SHELL_CLASS, 'rounded-2xl p-1')}
      data-testid="client-activity-description-view"
    >
      <div className={clsx(FEED_CARD_PREMIUM_SCROLL_CLASS, 'space-y-2')}>
        <h3 className={FEED_CARD_PREMIUM_TITLE_CLASS}>{title}</h3>
        <div className={FEED_CARD_PREMIUM_SURFACE_CLASS}>
          <p className="text-[12px] font-semibold text-white/85">
            {t('client_dashboard.budget_total_label')}: {budgetAmount}
          </p>
          {schedule ? (
            <p className="text-[12px] font-semibold text-white/85">
              {t('helper_dashboard.feed_card_schedule')}: {schedule}
            </p>
          ) : null}
          <p className="text-[12px] font-semibold text-white/85">
            {t('helper_dashboard.feed_card_location')}:{' '}
            {locationLabel || t('common.unknown')}
          </p>
        </div>
        {job.description?.trim() ? (
          <p className={clsx('whitespace-pre-wrap break-words pb-3', FEED_CARD_PREMIUM_BODY_CLASS)}>
            {job.description}
          </p>
        ) : (
          <p className={clsx('pb-3', FEED_CARD_PREMIUM_MUTED_CLASS)}>
            {t('client_dashboard.owner_no_extra_details')}
          </p>
        )}
      </div>
    </div>
  );

  const renderVipDecisionPanel = (app: Application) => {
    const firstName = firstNameFromHelperName(app.helperName);
    const amountLabel =
      app.proposedAmount != null
        ? formatMoneyAmount(app.proposedAmount, job.currency || 'CAD')
        : t('client_dashboard.helper_proposal_negotiable_short');
    const serviceMode =
      app.leadServiceMode === 'remote' || app.leadServiceMode === 'in_person'
        ? app.leadServiceMode
        : job.serviceMode;
    const serviceModeLabel =
      serviceMode === 'remote'
        ? t('create_modal.service_mode_remote')
        : serviceMode === 'in_person'
          ? t('create_modal.service_mode_in_person')
          : null;
    const ratingValue = Number(app.helperRating ?? 0);
    const jobsCount = Number(app.helperJobs ?? 0);
    const canAccept = canAcceptApplicationForJob({
      jobStatus: job.status,
      application: app,
      applications,
      acceptingApplicationId,
    });
    const busy = acceptingApplicationId === app.id || rejectingApplicationId === app.id;
    const message = app.message?.trim() || '';

    return (
      <div
        className={clsx(
          'mx-auto flex w-full max-w-sm flex-col',
          'gap-2.5 [@media(max-height:667px)]:gap-2 [@media(max-height:568px)]:gap-1.5',
        )}
        data-testid="client-activity-candidates-view"
        data-candidates-mode="exclusive"
        data-vip-layout="fit-no-inner-scroll"
      >
        <div
          data-testid="client-activity-vip-panel"
          className={clsx(
            'rounded-2xl border border-amber-200/80 bg-gradient-to-b from-amber-50 to-white',
            'px-3 py-3 [@media(max-height:640px)]:px-2.5 [@media(max-height:640px)]:py-2.5',
          )}
        >
          <div className="flex min-w-0 items-start gap-2.5">
            <img
              src={app.helperAvatar}
              alt=""
              className={clsx(
                'shrink-0 rounded-full object-cover ring-2 ring-amber-200',
                'h-12 w-12 [@media(max-height:640px)]:h-10 [@media(max-height:640px)]:w-10',
              )}
              data-testid="client-activity-vip-avatar"
            />
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                <p className="min-w-0 truncate text-[14px] font-bold text-slate-950">{firstName}</p>
                <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-amber-800">
                  <Icons.Crown className="h-2.5 w-2.5" aria-hidden />
                  {t('client_dashboard.vip_candidate_label')}
                </span>
              </div>
              <div className="mt-1">
                <LinkHelpRankBadgeFromStats
                  completedCount={app.helperJobs}
                  averageRating={app.helperRating}
                  role="helper"
                  size="sm"
                  showLabel
                  t={t}
                />
              </div>
            </div>
          </div>

          <div
            className="mt-2.5 flex flex-wrap items-center gap-1.5"
            data-testid="client-activity-vip-trust-chips"
          >
            {ratingValue > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-bold text-slate-700">
                <Icons.Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden />
                {ratingValue.toFixed(1)}
              </span>
            ) : null}
            {jobsCount > 0 ? (
              <span className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-bold tabular-nums text-slate-700">
                {t('profile_page.jobs_done', { count: jobsCount })}
              </span>
            ) : null}
          </div>

          <div
            className="mt-2 flex flex-wrap items-center gap-1.5"
            data-testid="client-activity-vip-proposal-chips"
          >
            <span className="inline-flex items-center rounded-lg border border-amber-200 bg-amber-50/80 px-2 py-0.5 text-[11px] font-black tabular-nums text-amber-900">
              {amountLabel}
            </span>
            {serviceModeLabel ? (
              <span className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-bold text-slate-700">
                {serviceModeLabel}
              </span>
            ) : null}
            {schedule ? (
              <span className="inline-flex max-w-full items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-bold text-slate-700">
                <Icons.Calendar className="h-3 w-3 shrink-0 text-slate-400" aria-hidden />
                <span className="truncate">{schedule}</span>
              </span>
            ) : null}
          </div>

          <div className="mt-2.5 space-y-1.5">
            {message ? (
              <p
                className="line-clamp-2 text-[12px] font-medium leading-snug text-slate-600"
                data-testid="client-activity-vip-message"
              >
                {message}
              </p>
            ) : null}
            <button
              type="button"
              data-testid="client-activity-vip-open-profile"
              onClick={() => openProfile(app.id)}
              className="inline-flex min-h-[36px] w-full items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-bold text-slate-800 hover:bg-slate-50"
            >
              {t('candidate_profile.toggle_label')}
              <Icons.ChevronRight className="h-3.5 w-3.5 text-slate-400" aria-hidden />
            </button>
          </div>
        </div>

        <div
          className={clsx(
            'flex flex-col gap-2 pb-[max(0.25rem,env(safe-area-inset-bottom))]',
            '[@media(min-height:740px)]:flex-row',
          )}
          data-testid="client-activity-vip-actions"
        >
          <button
            type="button"
            data-testid="client-activity-vip-accept"
            disabled={busy || !canAccept || teamComplete}
            onClick={() => tryAccept(app)}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-green-600 px-3 text-[13px] font-black text-white hover:bg-green-700 disabled:opacity-50"
          >
            {acceptingApplicationId === app.id ? (
              <Icons.Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              t('client_dashboard.accept_application_cta')
            )}
          </button>
          <button
            type="button"
            data-testid="client-activity-vip-reject"
            disabled={busy}
            onClick={() => void tryReject(app)}
            className="inline-flex min-h-[40px] flex-1 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-3 text-[12px] font-bold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
          >
            {rejectingApplicationId === app.id ? (
              <Icons.Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              t('client_dashboard.reject_helper')
            )}
          </button>
        </div>
      </div>
    );
  };

  const renderCandidatesContent = () => {
    if (exclusiveApp) {
      return renderVipDecisionPanel(exclusiveApp);
    }

    return (
      <div
        className={clsx(FEED_CARD_PREMIUM_SHELL_CLASS, 'rounded-2xl p-1')}
        data-testid="client-activity-candidates-view"
        data-candidates-mode="normal"
      >
        <div
          className={clsx(
            FEED_CARD_PREMIUM_SCROLL_CLASS,
            'max-h-[min(70vh,32rem)] space-y-2 pb-[max(1rem,env(safe-area-inset-bottom))]',
          )}
        >
          <p className={FEED_CARD_PREMIUM_EYEBROW_CLASS}>{t('client_dashboard.candidates_panel_title')}</p>
          {displayCandidates.length === 0 ? (
            <p className={FEED_CARD_PREMIUM_MUTED_CLASS} data-testid="client-activity-candidates-empty">
              {t('client_dashboard.candidates_empty_hint')}
            </p>
          ) : (
            displayCandidates.map((app, index) => (
              <div key={app.id} className="space-y-1">
                <p className="px-0.5 text-[10px] font-black uppercase tracking-wide text-white/55">
                  {t('client_dashboard.candidate_index_label', { index: index + 1 })}
                </p>
                {renderActionRow(app)}
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderProfileContent = () => {
    if (!profileApp) return null;
    return (
      <div
        key={profileApp.id}
        data-testid="client-activity-profile-view"
        data-profile-surface="light"
        data-profile-scroll="vertical"
        className="w-full max-w-none bg-[#F8FAFC] pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        <CandidateHelperProfileExpand
          surface="page"
          helperId={profileApp.helperId}
          helperName={profileApp.helperName}
          helperAvatar={profileApp.helperAvatar}
          helperRating={profileApp.helperRating}
          helperJobs={profileApp.helperJobs}
          isExclusive={Boolean(profileApp.isExclusive)}
          proposedAmount={profileApp.proposedAmount}
          currency={job.currency || 'CAD'}
          formatMoneyAmount={formatMoneyAmount}
        />
      </div>
    );
  };

  const candidatesOverlayTitle = exclusiveApp
    ? t('client_dashboard.exclusive_application_badge')
    : t('client_dashboard.candidates_panel_title');

  return (
    <>
      <div
        ref={cardShellRef}
        className={clsx(
          'relative mx-auto w-full max-w-lg',
          activityMenuOpen ? 'z-40' : 'z-0',
        )}
        data-testid="client-activity-open-card-shell"
      >
        <LhCard
          padding="none"
          className={clsx(
            FEED_CARD_SHELL_CLASS,
            '!h-auto overflow-visible',
            activityMenuOpen && '!overflow-visible',
          )}
          data-testid="client-activity-open-card"
          data-client-activity-overlay={overlay ?? 'summary'}
          data-feed-card-height-locked="false"
          data-feed-card-height-extra={FEED_CARD_FIXED_HEIGHT_EXTRA_PX}
          data-feed-card-min-height={ACTIVITY_APPLICATION_CARD_MIN_CONTENT_HEIGHT_PX}
        >
          <div
            className={FEED_CARD_TOP_ACCENT_CLASS}
            style={{
              background: `linear-gradient(90deg, ${categoryTheme.iconColor} 0%, ${categoryTheme.iconColor}55 55%, transparent 100%)`,
            }}
            aria-hidden
          />
          <div
            className={clsx(FEED_CARD_CONTENT_CLASS, 'overflow-visible', activityMenuOpen && '!overflow-visible')}
            style={activityApplicationCardMinContentStyle()}
          >
            {renderSummary()}
          </div>
        </LhCard>
      </div>

      <LhCardOverlay
        open={overlay === 'description'}
        onClose={closeOverlay}
        title={t('client_dashboard.view_description')}
        subtitle={title}
        testId="client-activity-description-overlay"
      >
        {renderDescriptionContent()}
      </LhCardOverlay>

      <LhCardOverlay
        open={overlay === 'candidates'}
        onClose={closeOverlay}
        title={candidatesOverlayTitle}
        subtitle={title}
        size={exclusiveApp ? 'fit' : 'standard'}
        bodyScroll={exclusiveApp ? 'fallback' : 'always'}
        layer="elevated"
        testId="client-activity-candidates-overlay"
      >
        {renderCandidatesContent()}
      </LhCardOverlay>

      <LhCardOverlay
        open={overlay === 'profile' && profileApp != null}
        onClose={closeOverlay}
        onBack={backFromProfile}
        title={profileApp?.helperName ?? t('client_dashboard.candidates_panel_title')}
        subtitle={title}
        size="standard"
        bodyScroll="always"
        flushBody
        layer="elevated"
        testId="client-activity-profile-overlay"
      >
        {renderProfileContent()}
      </LhCardOverlay>
    </>
  );
}
