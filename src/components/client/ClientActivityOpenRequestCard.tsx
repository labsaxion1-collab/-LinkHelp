import React, { useLayoutEffect, useRef, useState } from 'react';
import * as Icons from 'lucide-react';
import { clsx } from 'clsx';
import type { Application } from '@/types/application';
import type { Job } from '@/types/job';
import { ClientActivityCandidateRing } from '@/components/client/ClientActivityCandidateRing';
import { ClientActivityCandidateRow } from '@/components/client/ClientActivityCandidateRow';
import { CandidateHelperProfileExpand } from '@/components/client/CandidateHelperProfileExpand';
import { LinkHelpRankBadgeFromStats } from '@/components/ranking/LinkHelpRankBadge';
import {
  FEED_CARD_PREMIUM_BACK_CLASS,
  FEED_CARD_PREMIUM_BODY_CLASS,
  FEED_CARD_PREMIUM_EYEBROW_CLASS,
  FEED_CARD_PREMIUM_ICON_WHITE_CLASS,
  FEED_CARD_PREMIUM_MUTED_CLASS,
  FEED_CARD_PREMIUM_SCROLL_CLASS,
  FEED_CARD_PREMIUM_SHELL_CLASS,
  FEED_CARD_PREMIUM_SURFACE_CLASS,
  FEED_CARD_PREMIUM_TITLE_CLASS,
  FEED_CARD_PREMIUM_TOP_BAR_CLASS,
} from '@/components/opportunities/feedCardPremiumTheme';
import { getCategoryLucideIcon } from '@/utils/categoryIcons';
import { getCategoryFeedTheme } from '@/utils/categoryFeedTheme';
import { formatJobBudgetDisplay } from '@/utils/formatJobBudget';
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
  CLIENT_ACTIVITY_PANEL_CLASS,
  type ClientActivityCardView,
} from '@/utils/clientActivityCardView';
import {
  FEED_CARD_FIXED_HEIGHT_EXTRA_PX,
  measureFeedCardNaturalHeight,
  resolveFeedCardLockedHeight,
} from '@/utils/feedCardFixedHeight';

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
  lifecycleControlsEnabled: boolean;
  activityMenuOpen: boolean;
  onToggleActivityMenu: () => void;
  activityMenuRef?: React.Ref<HTMLDivElement>;
  onPause: () => void;
  onResume: () => void;
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
  showLifecycleMenu,
  lifecycleControlsEnabled,
  activityMenuOpen,
  onToggleActivityMenu,
  activityMenuRef,
  onPause,
  onResume,
  onCancel,
}: ClientActivityOpenRequestCardProps) {
  const [view, setView] = useState<ClientActivityCardView>('summary');
  const [profileAppId, setProfileAppId] = useState<string | null>(null);
  const [rejectingApplicationId, setRejectingApplicationId] = useState<string | null>(null);
  const [lockedHeight, setLockedHeight] = useState<number | null>(null);
  const shellRef = useRef<HTMLElement | null>(null);

  const CategoryIcon = getCategoryLucideIcon(job.category) ?? Icons.Briefcase;
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
  const isInternalView = view !== 'summary';
  const createdAtLabel = new Date(job.createdAt).toLocaleString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const schedule = formatJobScheduleDisplay(job, t);
  const budget = formatJobBudgetDisplay(job, t);
  const modalityLabel =
    job.serviceMode === 'remote'
      ? t('create_modal.service_mode_remote')
      : job.serviceMode === 'in_person'
        ? t('create_modal.service_mode_in_person')
        : null;

  useLayoutEffect(() => {
    if (view !== 'summary') return;
    const shell = shellRef.current;
    if (!shell) return;
    const natural = measureFeedCardNaturalHeight(shell);
    const next = resolveFeedCardLockedHeight(natural);
    if (next > 0) setLockedHeight(next);
  }, [view, job.id, title, candidateCount, isExclusiveLocked]);

  const goToView = (next: ClientActivityCardView) => {
    if (next !== 'summary' && shellRef.current) {
      const natural = measureFeedCardNaturalHeight(shellRef.current);
      const h = resolveFeedCardLockedHeight(natural);
      if (h > 0) setLockedHeight(h);
    }
    setView(next);
  };

  const goBack = () => {
    if (view === 'profile') {
      setView('candidates');
      return;
    }
    setProfileAppId(null);
    setView('summary');
  };

  const openProfile = (appId: string) => {
    setProfileAppId(appId);
    setView('profile');
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

  const openCandidatesPanel = () => {
    goToView('candidates');
  };

  const ringAriaLabel =
    exclusiveApp != null
      ? t('client_dashboard.open_vip_candidate_a11y')
      : candidateCount <= 0
        ? t('client_dashboard.open_candidates_a11y_zero')
        : t('client_dashboard.open_candidates_a11y', { count: candidateCount });

  const lockedStyle =
    lockedHeight != null
      ? {
          height: lockedHeight,
          minHeight: lockedHeight,
          maxHeight: lockedHeight,
        }
      : undefined;

  const statusPill = isExclusiveLocked ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-800">
      <Icons.Crown className="h-3 w-3" aria-hidden />
      {t('client_dashboard.exclusive_application_badge')}
    </span>
  ) : (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black',
        isJobPaused(job)
          ? 'border-slate-200 bg-slate-100 text-slate-700'
          : 'border-sky-200 bg-sky-50 text-sky-800',
      )}
    >
      <Icons.Clock3 className="h-3 w-3" aria-hidden />
      {isJobPaused(job) ? t('client_dashboard.status_paused') : t('client_dashboard.status_waiting_helpers')}
    </span>
  );

  const renderBackBar = (label: string) => (
    <div className={FEED_CARD_PREMIUM_TOP_BAR_CLASS} data-testid="client-activity-card-top-bar">
      <button
        type="button"
        data-testid="client-activity-card-back"
        onClick={(e) => {
          e.stopPropagation();
          goBack();
        }}
        className={FEED_CARD_PREMIUM_BACK_CLASS}
        aria-label={label}
      >
        <Icons.ArrowLeft className={FEED_CARD_PREMIUM_ICON_WHITE_CLASS} aria-hidden />
        {label}
      </button>
    </div>
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

  const renderSummary = () => (
    <div className="relative z-0" data-testid="client-activity-card-summary">
      {showLifecycleMenu ? (
        <div
          ref={activityMenuOpen ? activityMenuRef : undefined}
          className="absolute right-0 top-0 z-20"
        >
          <button
            type="button"
            aria-label={t('common.more_options')}
            aria-expanded={activityMenuOpen}
            onClick={(e) => {
              e.stopPropagation();
              onToggleActivityMenu();
            }}
            className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
          >
            <Icons.MoreVertical className="h-5 w-5" />
          </button>
          {activityMenuOpen ? (
            <div className="absolute right-0 top-full z-50 mt-1 min-w-[11rem] overflow-hidden rounded-xl border border-slate-100 bg-white py-1 shadow-[0_12px_32px_rgba(15,23,42,0.14)]">
              {lifecycleControlsEnabled && job.status === 'paused' ? (
                <button
                  type="button"
                  onClick={() => void onResume()}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-bold text-slate-800 hover:bg-slate-50"
                >
                  <Icons.Play className="h-4 w-4 text-blue-600" aria-hidden />
                  {t('client_dashboard.resume_request')}
                </button>
              ) : lifecycleControlsEnabled && job.status === 'open' ? (
                <button
                  type="button"
                  onClick={onPause}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-bold text-slate-800 hover:bg-slate-50"
                >
                  <Icons.Pause className="h-4 w-4 text-blue-600" aria-hidden />
                  {t('client_dashboard.pause_request')}
                </button>
              ) : null}
              {lifecycleControlsEnabled ? (
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-bold text-amber-800 hover:bg-amber-50"
                >
                  <Icons.Ban className="h-4 w-4 text-amber-600" aria-hidden />
                  {t('client_dashboard.cancel_request')}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <div
        className={clsx(
          'grid w-full min-w-0 grid-cols-[48px_minmax(0,1fr)_68px] grid-rows-[auto_auto_auto] gap-x-2 gap-y-1 sm:grid-cols-[56px_minmax(0,1fr)_68px]',
          showLifecycleMenu && 'pr-6',
        )}
      >
        <div
          className="col-start-1 row-span-2 row-start-1 flex h-[48px] w-[48px] items-center justify-center self-start rounded-xl border sm:h-[52px] sm:w-[52px] sm:rounded-[16px]"
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

        <div className="col-start-2 row-start-1 min-w-0">
          <div className="mb-1">{statusPill}</div>
          <h3 className="line-clamp-2 text-[15px] font-bold leading-[1.28] text-[#0F172A] sm:text-[17px]">
            {title}
          </h3>
        </div>

        <div className="col-start-2 row-start-2 min-w-0 self-start">
          <div className="mb-0.5 flex min-w-0 items-center gap-1.5">
            <span
              className="h-[6px] w-[6px] shrink-0 rounded-full"
              style={{ backgroundColor: categoryTheme.dotColor }}
            />
            <span className="truncate text-[11px] font-medium text-[#94A3B8]">{category}</span>
          </div>
          <p className="truncate text-[12px] font-semibold text-[#64748B]">
            <span className="font-bold" style={{ color: categoryTheme.budgetColor }}>
              {budget}
            </span>
            {schedule ? ` · ${schedule}` : ''}
          </p>
        </div>

        <div className="col-start-3 row-span-2 row-start-1 flex shrink-0 items-center justify-center self-center">
          <ClientActivityCandidateRing
            segmentColors={segmentColors}
            exclusiveFullColor={exclusiveFullColor}
            size={68}
            count={candidateCount}
            ariaLabel={ringAriaLabel}
            onActivate={openCandidatesPanel}
          />
        </div>

        <div className="col-span-3 col-start-1 row-start-3 mt-1 flex items-center justify-end border-t border-[rgba(15,23,42,0.06)] pt-2">
          <button
            type="button"
            data-testid="client-activity-open-description"
            onClick={() => goToView('description')}
            className="inline-flex min-h-[36px] shrink-0 items-center justify-center gap-1.5 rounded-[12px] border border-slate-200 bg-white px-3 text-[12px] font-bold text-slate-800 shadow-sm hover:bg-slate-50"
            aria-expanded={view === 'description'}
          >
            {t('client_dashboard.view_description')}
          </button>
        </div>
      </div>
    </div>
  );

  const renderDescription = () => (
    <div
      className={CLIENT_ACTIVITY_PANEL_CLASS}
      data-testid="client-activity-description-view"
    >
      {renderBackBar(t('nav.back'))}
      <div className={clsx(FEED_CARD_PREMIUM_SCROLL_CLASS, 'space-y-2.5')}>
        <p className={FEED_CARD_PREMIUM_EYEBROW_CLASS}>{t('client_dashboard.description_panel_title')}</p>
        <h3 className={FEED_CARD_PREMIUM_TITLE_CLASS}>{title}</h3>
        <div className={FEED_CARD_PREMIUM_SURFACE_CLASS}>
          <p className="text-[12px] font-semibold text-white/85">
            {t('helper_dashboard.feed_card_budget')}: {budget}
          </p>
          {schedule ? (
            <p className="text-[12px] font-semibold text-white/85">
              {t('helper_dashboard.feed_card_schedule')}: {schedule}
            </p>
          ) : null}
          {modalityLabel ? (
            <p className="text-[12px] font-semibold text-white/85">
              {t('client_dashboard.activity_modality')}: {modalityLabel}
            </p>
          ) : null}
          <p className="text-[12px] font-semibold text-white/85">
            {t('client_dashboard.created_at_label')}: {createdAtLabel}
          </p>
          <p className="text-[12px] font-semibold text-white/85">
            {t('helper_dashboard.feed_card_location')}:{' '}
            {job.address || job.city || job.location || t('common.unknown')}
          </p>
        </div>
        {job.description?.trim() ? (
          <p className={clsx('whitespace-pre-wrap', FEED_CARD_PREMIUM_BODY_CLASS)}>{job.description}</p>
        ) : (
          <p className={FEED_CARD_PREMIUM_MUTED_CLASS}>{t('helper_dashboard.feed_card_no_description')}</p>
        )}
      </div>
    </div>
  );

  const renderCandidates = () => {
    if (exclusiveApp) {
      const rank = getHelperRank({
        completedCount: exclusiveApp.helperJobs ?? 0,
        averageRating: exclusiveApp.helperRating ?? 0,
      });
      return (
        <div
          className={CLIENT_ACTIVITY_PANEL_CLASS}
          data-testid="client-activity-candidates-view"
          data-candidates-mode="exclusive"
        >
          {renderBackBar(t('nav.back'))}
          <div className={clsx(FEED_CARD_PREMIUM_SCROLL_CLASS, 'space-y-3')}>
            {renderActionRow(exclusiveApp, 'border-amber-200/80')}
            <div
              data-testid="client-activity-vip-panel"
              className="rounded-2xl border border-amber-300/45 bg-gradient-to-b from-amber-400/20 to-amber-500/5 px-3 py-4 text-center"
            >
              <Icons.Crown
                className="mx-auto h-10 w-10 text-amber-300"
                style={{ filter: 'drop-shadow(0 0 8px rgba(245,158,11,0.55))' }}
                aria-hidden
              />
              <p className="mt-2 text-[13px] font-black tracking-wide text-amber-100">
                {t('client_dashboard.vip_candidate_label')}
              </p>
              <p className="mt-1 truncate text-[15px] font-bold text-white">
                {firstNameFromHelperName(exclusiveApp.helperName)}
              </p>
              <div className="mt-2 flex justify-center">
                <LinkHelpRankBadgeFromStats
                  completedCount={exclusiveApp.helperJobs}
                  averageRating={exclusiveApp.helperRating}
                  role="helper"
                  size="md"
                  showLabel
                  t={t}
                />
              </div>
              <p className="mt-2 text-[11px] font-semibold text-amber-100/80" style={{ color: rank.accent }}>
                {t(`ranking.helper.${rank.tier}`)}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        className={CLIENT_ACTIVITY_PANEL_CLASS}
        data-testid="client-activity-candidates-view"
        data-candidates-mode="normal"
      >
        {renderBackBar(t('nav.back'))}
        <div className={clsx(FEED_CARD_PREMIUM_SCROLL_CLASS, 'space-y-2')}>
          <p className={FEED_CARD_PREMIUM_EYEBROW_CLASS}>{t('client_dashboard.candidates_panel_title')}</p>
          {displayCandidates.length === 0 ? (
            <p className={FEED_CARD_PREMIUM_MUTED_CLASS} data-testid="client-activity-candidates-empty">
              {t('client_dashboard.candidates_empty_hint')}
            </p>
          ) : (
            displayCandidates.map((app) => renderActionRow(app))
          )}
        </div>
      </div>
    );
  };

  const renderProfile = () => {
    if (!profileApp) return null;
    const canAccept = canAcceptApplicationForJob({
      jobStatus: job.status,
      application: profileApp,
      applications,
      acceptingApplicationId,
    });
    return (
      <div
        className={CLIENT_ACTIVITY_PANEL_CLASS}
        data-testid="client-activity-profile-view"
      >
        {renderBackBar(t('client_dashboard.back_to_candidates'))}
        <div className={clsx(FEED_CARD_PREMIUM_SCROLL_CLASS, 'space-y-3')}>
          <div className="flex items-start gap-3">
            <img
              src={profileApp.helperAvatar}
              alt=""
              className="h-12 w-12 rounded-full object-cover ring-2 ring-white/40"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-bold text-white">{profileApp.helperName}</p>
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
              helperRating={profileApp.helperRating}
              helperJobs={profileApp.helperJobs}
            />
          </div>
          {(profileApp.status === 'pending' || profileApp.status === 'viewed') && (
            <div className="sticky bottom-0 flex gap-2">
              <button
                type="button"
                disabled={!canAccept || acceptingApplicationId === profileApp.id || rejectingApplicationId != null}
                onClick={() => tryAccept(profileApp)}
                className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-green-600 text-sm font-black text-white hover:bg-green-700 disabled:opacity-60"
                aria-label={t('client_dashboard.accept_short')}
              >
                {acceptingApplicationId === profileApp.id ? (
                  <Icons.Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                ) : (
                  t('client_dashboard.accept_short')
                )}
              </button>
              <button
                type="button"
                disabled={rejectingApplicationId != null || acceptingApplicationId != null}
                onClick={() => void tryReject(profileApp)}
                className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-60"
                aria-label={t('client_dashboard.reject_helper')}
              >
                {rejectingApplicationId === profileApp.id ? (
                  <Icons.Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                ) : (
                  t('client_dashboard.reject_helper')
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <article
      ref={shellRef}
      data-testid="client-activity-open-card"
      data-client-activity-view={view}
      data-feed-card-height-locked={lockedHeight != null ? 'true' : 'false'}
      data-feed-card-height-extra={FEED_CARD_FIXED_HEIGHT_EXTRA_PX}
      className={clsx(
        'group relative min-w-0 overflow-hidden rounded-[1.35rem] border border-slate-100 bg-white p-3 shadow-[0_10px_30px_rgba(15,23,42,0.07)] transition-shadow duration-200 sm:p-4',
        isInternalView ? 'z-30' : 'z-0 hover:shadow-[0_16px_42px_rgba(15,23,42,0.11)]',
      )}
      style={lockedStyle}
    >
      <div
        className={clsx(isInternalView && 'invisible pointer-events-none select-none')}
        aria-hidden={isInternalView}
        data-testid="client-activity-card-summary-shell"
      >
        {renderSummary()}
      </div>
      {isInternalView ? (
        <div className={FEED_CARD_PREMIUM_SHELL_CLASS} data-testid="client-activity-premium-shell">
          {view === 'description' ? renderDescription() : null}
          {view === 'candidates' ? renderCandidates() : null}
          {view === 'profile' ? renderProfile() : null}
        </div>
      ) : null}
    </article>
  );
}
