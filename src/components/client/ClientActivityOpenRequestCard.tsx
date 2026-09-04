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
import { getHelperRank } from '@/utils/linkHelpRanking';
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
  FEED_CARD_CONTENT_CLASS,
  FEED_CARD_FIXED_HEIGHT_EXTRA_PX,
  FEED_CARD_SHELL_CLASS,
  FEED_CARD_STANDARD_CONTENT_HEIGHT_PX,
  FEED_CARD_TOP_ACCENT_CLASS,
  feedCardLockedContentStyle,
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
      className="relative z-0 flex h-full min-h-0 flex-col"
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

  const renderCandidatesContent = () => {
    if (exclusiveApp) {
      const rank = getHelperRank({
        completedCount: exclusiveApp.helperJobs ?? 0,
        averageRating: exclusiveApp.helperRating ?? 0,
      });
      return (
        <div
          className={clsx(FEED_CARD_PREMIUM_SHELL_CLASS, 'rounded-2xl p-1')}
          data-testid="client-activity-candidates-view"
          data-candidates-mode="exclusive"
        >
          <div
            className={clsx(
              FEED_CARD_PREMIUM_SCROLL_CLASS,
              'flex max-h-[min(70vh,32rem)] flex-col space-y-3 pb-[max(1rem,env(safe-area-inset-bottom))]',
            )}
          >
            <div
              data-testid="client-activity-vip-panel"
              className="mx-auto flex w-full max-w-sm flex-col items-center rounded-2xl border border-amber-300/45 bg-gradient-to-b from-amber-400/20 to-amber-500/5 px-3 pb-5 pt-6 text-center"
            >
              <Icons.Crown
                className="h-7 w-7 text-amber-300"
                style={{ filter: 'drop-shadow(0 0 8px rgba(245,158,11,0.55))' }}
                aria-hidden
              />
              <p className="mt-2 text-[11px] font-black tracking-wide text-amber-100">
                {t('client_dashboard.vip_candidate_label')}
              </p>
              <img
                src={exclusiveApp.helperAvatar}
                alt=""
                className="mt-3 h-14 w-14 rounded-full object-cover ring-2 ring-amber-200/80"
                data-testid="client-activity-vip-avatar"
              />
              <p className="mt-2 max-w-full truncate text-[15px] font-bold text-white">
                {firstNameFromHelperName(exclusiveApp.helperName)}
              </p>
              <div className="mt-2 flex justify-center">
                <LinkHelpRankBadgeFromStats
                  completedCount={exclusiveApp.helperJobs}
                  averageRating={exclusiveApp.helperRating}
                  role="helper"
                  size="sm"
                  showLabel
                  t={t}
                />
              </div>
              <p className="mt-1 text-[10px] font-semibold" style={{ color: rank.accent }}>
                {t(`ranking.helper.${rank.tier}`)}
              </p>
              <p className="mt-2 text-[12px] font-black tabular-nums text-white">
                {exclusiveApp.proposedAmount != null
                  ? formatMoneyAmount(exclusiveApp.proposedAmount, job.currency || 'CAD')
                  : t('client_dashboard.helper_proposal_negotiable_short')}
              </p>
              <button
                type="button"
                data-testid="client-activity-vip-open-profile"
                onClick={() => openProfile(exclusiveApp.id)}
                className="mt-3 inline-flex min-h-[36px] items-center justify-center rounded-xl border border-white/25 bg-white/10 px-3 text-[11px] font-bold text-white hover:bg-white/15"
              >
                {t('candidate_profile.toggle_label')}
              </button>
            </div>
            <div
              className="sticky bottom-0 z-10 shrink-0 bg-gradient-to-t from-[#0B1220] via-[#0B1220]/95 to-transparent pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2"
              data-testid="client-activity-vip-actions"
            >
              {renderActionRow(exclusiveApp, 'border-amber-200/80')}
            </div>
          </div>
        </div>
      );
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
        className={clsx(FEED_CARD_PREMIUM_SHELL_CLASS, 'rounded-2xl p-1')}
        data-testid="client-activity-profile-view"
      >
        <div className={clsx(FEED_CARD_PREMIUM_SCROLL_CLASS, 'space-y-2')}>
          <div className="flex items-start gap-3">
            <img
              src={profileApp.helperAvatar}
              alt=""
              className="h-11 w-11 rounded-full object-cover ring-2 ring-white/40"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-bold text-white">{profileApp.helperName}</p>
              <div className="mt-1">
                <LinkHelpRankBadgeFromStats
                  completedCount={profileApp.helperJobs}
                  averageRating={profileApp.helperRating}
                  role="helper"
                  size="sm"
                  showLabel
                  t={t}
                />
              </div>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl bg-white/95">
            <CandidateHelperProfileExpand
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
        </div>
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
        className={clsx('relative', activityMenuOpen ? 'z-40' : 'z-0')}
      >
        <LhCard
          padding="none"
          className={clsx(FEED_CARD_SHELL_CLASS, activityMenuOpen && '!overflow-visible')}
          data-testid="client-activity-open-card"
          data-client-activity-overlay={overlay ?? 'summary'}
          data-feed-card-height-locked="true"
          data-feed-card-height-extra={FEED_CARD_FIXED_HEIGHT_EXTRA_PX}
          data-feed-card-standard-height={FEED_CARD_STANDARD_CONTENT_HEIGHT_PX}
        >
          <div
            className={FEED_CARD_TOP_ACCENT_CLASS}
            style={{
              background: `linear-gradient(90deg, ${categoryTheme.iconColor} 0%, ${categoryTheme.iconColor}55 55%, transparent 100%)`,
            }}
            aria-hidden
          />
          <div
            className={clsx(FEED_CARD_CONTENT_CLASS, activityMenuOpen && '!overflow-visible')}
            style={feedCardLockedContentStyle()}
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
        testId="client-activity-profile-overlay"
      >
        {renderProfileContent()}
      </LhCardOverlay>
    </>
  );
}
