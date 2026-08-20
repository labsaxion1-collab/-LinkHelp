import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import { clsx } from 'clsx';
import type { Application } from '@/types/application';
import type { Job } from '@/types/job';
import type { UpcomingJob } from '@/types/upcoming';
import type { ServiceReview } from '@/types/review';
import { LinkHelpRankBadgeFromStats } from '@/components/ranking/LinkHelpRankBadge';
import { CandidateHelperProfileExpand } from '@/components/client/CandidateHelperProfileExpand';
import { LhCard } from '@/components/design-system/LhCard';
import { LhCardOverlay } from '@/components/design-system/LhCardOverlay';
import {
  FEED_CARD_PREMIUM_BODY_CLASS,
  FEED_CARD_PREMIUM_MUTED_CLASS,
  FEED_CARD_PREMIUM_SCROLL_CLASS,
  FEED_CARD_PREMIUM_SHELL_CLASS,
  FEED_CARD_PREMIUM_SURFACE_CLASS,
  FEED_CARD_PREMIUM_TITLE_CLASS,
} from '@/components/opportunities/feedCardPremiumTheme';
import { getCategoryFeedTheme } from '@/utils/categoryFeedTheme';
import { getCategoryIconById } from '@/utils/categoryIcons';
import { formatJobBudgetAmount } from '@/utils/formatJobBudget';
import { formatJobScheduleDisplay } from '@/utils/jobDisplay';
import { avatarUrlForName } from '@/utils/avatarUrl';
import {
  translateCategory,
  translateJobTitle,
  translateServiceSubcategory,
} from '@/utils/translateCategory';
import {
  resolveCompletedReviewUiState,
  resolveCompletionTimestamp,
  type CompletedReviewUiState,
} from '@/utils/completedServiceHistory';
import {
  FEED_CARD_CONTENT_CLASS,
  FEED_CARD_FIXED_HEIGHT_EXTRA_PX,
  FEED_CARD_SHELL_CLASS,
  FEED_CARD_STANDARD_CONTENT_HEIGHT_PX,
  FEED_CARD_TOP_ACCENT_CLASS,
  feedCardLockedContentStyle,
} from '@/utils/feedCardFixedHeight';

type PanelView = 'description' | 'profile' | null;

type Props = {
  job: Job;
  hiredApplication: Application | undefined;
  upcoming: UpcomingJob | undefined;
  reviews: ServiceReview[];
  reviewerId: string;
  pendingRequestIds: ReadonlySet<string>;
  t: (key: string, vars?: Record<string, string | number>) => string;
  formatMoneyAmount: (amount: number, currency: string) => string;
  locale: string;
  onRate: () => void;
  onViewSubmittedReview: () => void;
};

function formatHistoryDate(ts: number, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(ts));
  } catch {
    return new Date(ts).toLocaleString();
  }
}

function peerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  return (parts[0]?.slice(0, 2) ?? '?').toUpperCase();
}

function hasRealPhoto(url?: string | null): boolean {
  const value = url?.trim() ?? '';
  if (!value) return false;
  if (value.includes('pravatar.cc') || value.includes('i.pravatar')) return false;
  return true;
}

function CompactReviewAction({
  state,
  myRating,
  t,
  onRate,
  onViewSubmitted,
}: {
  state: CompletedReviewUiState;
  myRating: number | null;
  t: (key: string) => string;
  onRate: () => void;
  onViewSubmitted: () => void;
}) {
  if (state === 'submitted') {
    return (
      <button
        type="button"
        data-testid="completed-review-submitted"
        onClick={onViewSubmitted}
        className="inline-flex min-h-[36px] max-w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 text-[11px] font-bold text-emerald-900 hover:bg-emerald-100"
      >
        <Icons.CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="truncate">{t('service_review.review_submitted')}</span>
        {myRating != null ? (
          <span className="inline-flex shrink-0 items-center gap-0.5">
            <Icons.Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden />
            {myRating.toFixed(1)}
          </span>
        ) : null}
      </button>
    );
  }

  return (
    <button
      type="button"
      data-testid="completed-review-rate"
      onClick={onRate}
      className="inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 text-[11px] font-bold text-amber-950 hover:bg-amber-100"
    >
      <Icons.Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
      {t('service_review.rate_action')}
    </button>
  );
}

export function ClientCompletedHistoryCard({
  job,
  hiredApplication,
  upcoming,
  reviews,
  reviewerId,
  pendingRequestIds,
  t,
  formatMoneyAmount,
  locale,
  onRate,
  onViewSubmittedReview,
}: Props) {
  const [panel, setPanel] = useState<PanelView>(null);
  const theme = getCategoryFeedTheme(job.category);
  const CategoryIcon = getCategoryIconById(job.category);
  const title = translateJobTitle(job.title, job.category, job.subcategory, t);
  const categoryLabel = translateCategory(job.category, t);
  const subcategoryLabel = job.subcategory
    ? translateServiceSubcategory(job.category, job.subcategory, t)
    : null;
  const schedule = formatJobScheduleDisplay(job, t);
  const budgetAmount = formatJobBudgetAmount(job, t);
  const agreed = hiredApplication?.proposedAmount ?? job.acceptedAmount ?? null;
  const agreedLabel =
    agreed != null ? formatMoneyAmount(agreed, job.currency || 'CAD') : budgetAmount;
  const modality =
    job.serviceMode === 'remote'
      ? t('create_modal.service_mode_remote')
      : job.serviceMode === 'in_person'
        ? t('create_modal.service_mode_in_person')
        : t('common.unknown');
  const locationLabel =
    job.serviceMode === 'remote'
      ? null
      : job.address || job.city || job.location || null;
  const isVip = Boolean(hiredApplication?.isExclusive || job.exclusiveHelperId);

  const myReview = reviews.find((r) => r.requestId === job.id && r.reviewerId === reviewerId);
  const completionTs = resolveCompletionTimestamp(upcoming, myReview);
  const { state: reviewState, myRating } = resolveCompletedReviewUiState({
    requestId: job.id,
    reviewerId,
    reviews,
    pendingRequestIds,
  });

  const helperName = hiredApplication?.helperName ?? '';
  const helperPhoto = hiredApplication?.helperAvatar ?? '';
  const showPhoto = hasRealPhoto(helperPhoto);

  const closeOverlay = () => setPanel(null);

  const openHiredProfile = () => {
    if (!hiredApplication) return;
    setPanel('profile');
  };

  const renderDescriptionContent = () => (
    <div
      className={clsx(FEED_CARD_PREMIUM_SHELL_CLASS, 'rounded-2xl p-1')}
      data-testid="completed-description-panel"
    >
      <div className={clsx(FEED_CARD_PREMIUM_SCROLL_CLASS, 'space-y-2')}>
        <h3 className={FEED_CARD_PREMIUM_TITLE_CLASS}>{title}</h3>
        <div className={FEED_CARD_PREMIUM_SURFACE_CLASS}>
          <p className="text-[12px] font-semibold text-white/85">
            {categoryLabel}
            {subcategoryLabel ? ` · ${subcategoryLabel}` : ''}
          </p>
          <p className="text-[12px] font-semibold text-white/85">
            {t('client_jobs.history_service_date')}: {schedule || '—'}
          </p>
          <p className="text-[12px] font-semibold text-white/85">
            {t('client_jobs.history_completed_date')}:{' '}
            {completionTs
              ? formatHistoryDate(completionTs, locale)
              : t('service_review.service_completed')}
          </p>
          <p className="text-[12px] font-semibold text-white/85">
            {t('client_dashboard.activity_modality')}: {modality}
          </p>
          {locationLabel ? (
            <p className="text-[12px] font-semibold text-white/85">
              {t('client_jobs.history_location')}: {locationLabel}
            </p>
          ) : null}
          <p className="text-[12px] font-semibold text-white/85">
            {t('client_jobs.history_agreed_value')}: {agreedLabel || '—'}
          </p>
          {isVip ? (
            <p className="text-[12px] font-semibold text-amber-200">
              {t('client_dashboard.exclusive_application_badge')}
            </p>
          ) : null}
        </div>
        {job.description?.trim() ? (
          <p className={clsx('whitespace-pre-wrap break-words', FEED_CARD_PREMIUM_BODY_CLASS)}>
            {job.description}
          </p>
        ) : (
          <p className={FEED_CARD_PREMIUM_MUTED_CLASS}>
            {t('client_dashboard.owner_no_extra_details')}
          </p>
        )}
      </div>
    </div>
  );

  const renderProfileContent = () => {
    if (!hiredApplication) return null;
    return (
      <div
        className={clsx(FEED_CARD_PREMIUM_SHELL_CLASS, 'rounded-2xl p-1')}
        data-testid="completed-helper-profile-panel"
      >
        <div className={clsx(FEED_CARD_PREMIUM_SCROLL_CLASS, 'space-y-2')}>
          <div className="flex items-start gap-3">
            {showPhoto ? (
              <img
                src={helperPhoto}
                alt=""
                onError={(e) => {
                  e.currentTarget.src = avatarUrlForName(helperName);
                }}
                className="h-11 w-11 rounded-full object-cover ring-2 ring-white/40"
              />
            ) : (
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-[12px] font-black text-white ring-2 ring-white/40">
                {peerInitials(helperName)}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-bold text-white">{helperName}</p>
              <div className="mt-1">
                <LinkHelpRankBadgeFromStats
                  completedCount={hiredApplication.helperJobs}
                  averageRating={hiredApplication.helperRating}
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
              helperId={hiredApplication.helperId}
              helperRating={hiredApplication.helperRating}
              helperJobs={hiredApplication.helperJobs}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="relative z-0">
        <LhCard
          padding="none"
          className={FEED_CARD_SHELL_CLASS}
          data-testid="client-completed-history-card"
          data-job-id={job.id}
          data-completed-panel={panel ?? 'summary'}
          data-feed-card-height-locked="true"
          data-feed-card-height-extra={FEED_CARD_FIXED_HEIGHT_EXTRA_PX}
          data-feed-card-standard-height={FEED_CARD_STANDARD_CONTENT_HEIGHT_PX}
        >
          <div
            className={FEED_CARD_TOP_ACCENT_CLASS}
            style={{
              background: `linear-gradient(90deg, ${theme.iconColor} 0%, ${theme.iconColor}55 55%, transparent 100%)`,
            }}
            aria-hidden
          />
          <div className={FEED_CARD_CONTENT_CLASS} style={feedCardLockedContentStyle()}>
            <div className="flex h-full min-h-0 flex-col" data-testid="completed-card-summary">
              <div className="flex shrink-0 items-start gap-2">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border sm:h-11 sm:w-11"
                  style={{
                    backgroundColor: theme.iconBg,
                    borderColor: `${theme.iconColor}28`,
                    boxShadow: `0 5px 14px ${theme.iconColor}16`,
                  }}
                >
                  <CategoryIcon
                    className="h-5 w-5"
                    style={{ color: theme.iconColor }}
                    strokeWidth={1.9}
                    aria-hidden
                  />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-800">
                      <Icons.CheckCircle2 className="h-3 w-3" aria-hidden />
                      {t('service_review.service_completed')}
                    </span>
                    {isVip ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-800">
                        <Icons.Crown className="h-3 w-3" aria-hidden />
                        {t('client_dashboard.exclusive_application_badge')}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-1 line-clamp-2 text-[14px] font-black leading-snug text-slate-950 sm:text-[15px]">
                    {title}
                  </h3>
                  <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">
                    {subcategoryLabel ? `${categoryLabel} · ${subcategoryLabel}` : categoryLabel}
                  </p>
                </div>
              </div>

              <div className="mt-2 flex min-h-0 flex-1 items-center gap-2.5">
                {hiredApplication ? (
                  <button
                    type="button"
                    data-testid="completed-hired-helper"
                    onClick={openHiredProfile}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-xl text-left transition-colors hover:bg-slate-50"
                  >
                    {showPhoto ? (
                      <img
                        src={helperPhoto}
                        alt=""
                        onError={(e) => {
                          e.currentTarget.src = avatarUrlForName(helperName);
                        }}
                        className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-white"
                      />
                    ) : (
                      <span
                        data-testid="completed-helper-initials"
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] font-black text-slate-700 ring-2 ring-white"
                      >
                        {peerInitials(helperName)}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-black text-slate-950">{helperName}</p>
                      <p className="mt-0.5 flex min-w-0 flex-wrap items-center gap-1 text-[10px] font-bold text-slate-500">
                        <Icons.Star
                          className="h-3 w-3 shrink-0 fill-yellow-400 text-yellow-400"
                          aria-hidden
                        />
                        <span>{Number(hiredApplication.helperRating || 0).toFixed(1)}</span>
                        <LinkHelpRankBadgeFromStats
                          completedCount={hiredApplication.helperJobs}
                          averageRating={hiredApplication.helperRating}
                          role="helper"
                          size="sm"
                          showLabel
                          t={t}
                        />
                      </p>
                    </div>
                  </button>
                ) : (
                  <p className="min-w-0 flex-1 text-[11px] font-semibold text-slate-500">
                    {t('client_jobs.history_help_unknown')}
                  </p>
                )}
                <p
                  data-testid="completed-agreed-value"
                  className="shrink-0 truncate whitespace-nowrap text-[13px] font-black text-emerald-700"
                >
                  {agreedLabel || '—'}
                </p>
              </div>

              <div
                className="mt-auto flex shrink-0 items-center gap-2 border-t border-slate-100 pt-2"
                data-testid="completed-card-footer"
              >
                <button
                  type="button"
                  data-testid="completed-open-description"
                  onClick={() => setPanel('description')}
                  className="inline-flex min-h-[36px] flex-1 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 text-[11px] font-bold text-slate-800 hover:bg-slate-50"
                >
                  {t('client_dashboard.view_description')}
                  <Icons.ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                </button>
                <CompactReviewAction
                  state={reviewState}
                  myRating={myRating}
                  t={t}
                  onRate={onRate}
                  onViewSubmitted={onViewSubmittedReview}
                />
              </div>
            </div>
          </div>
        </LhCard>
      </div>

      <LhCardOverlay
        open={panel === 'description'}
        onClose={closeOverlay}
        title={t('client_dashboard.view_description')}
        subtitle={title}
        testId="completed-description-overlay"
      >
        {renderDescriptionContent()}
      </LhCardOverlay>

      <LhCardOverlay
        open={panel === 'profile' && hiredApplication != null}
        onClose={closeOverlay}
        title={helperName}
        subtitle={title}
        testId="completed-profile-overlay"
        maxWidthClass="max-w-md"
        maxHeightClass="max-h-[min(72dvh,560px)]"
      >
        {renderProfileContent()}
      </LhCardOverlay>
    </>
  );
}
