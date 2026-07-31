import { memo, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { hapticSuccess } from '@/utils/haptic';
import * as Icons from 'lucide-react';
import { CheckCircle2 } from 'lucide-react';
import { getCategoryIconById } from '@/utils/categoryIcons';
import { clsx } from 'clsx';
import type { Job } from '@/types/job';
import { formatJobOpenedAt } from '@/utils/jobDisplay';
import { getCategoryFeedTheme } from '@/utils/categoryFeedTheme';
import { translateJobTitle, resolveCategoryId } from '@/utils/translateCategory';
import { LhCard } from '@/components/design-system/LhCard';
import { InterestedRing } from '@/components/opportunities/InterestedRing';
import { HelperApplyConfirmModal } from '@/components/modals/HelperApplyConfirmModal';
import { HelperOpportunityLcDebugPanel } from '@/components/opportunities/HelperOpportunityLcDebugPanel';
import { FeedCardClientProfilePanel } from '@/components/opportunities/FeedCardClientProfilePanel';
import {
  FEED_CARD_PREMIUM_BACK_CLASS,
  FEED_CARD_PREMIUM_BODY_CLASS,
  FEED_CARD_PREMIUM_EYEBROW_CLASS,
  FEED_CARD_PREMIUM_ICON_LIGHT_CLASS,
  FEED_CARD_PREMIUM_ICON_WHITE_CLASS,
  FEED_CARD_PREMIUM_INPUT_CLASS,
  FEED_CARD_PREMIUM_MUTED_CLASS,
  FEED_CARD_PREMIUM_QUOTE_NORMAL_CLASS,
  FEED_CARD_PREMIUM_QUOTE_VIP_CLASS,
  FEED_CARD_PREMIUM_SCROLL_CLASS,
  FEED_CARD_PREMIUM_SHELL_CLASS,
  FEED_CARD_PREMIUM_SURFACE_CLASS,
  FEED_CARD_PREMIUM_TITLE_CLASS,
  FEED_CARD_PREMIUM_TOP_BAR_CLASS,
} from '@/components/opportunities/feedCardPremiumTheme';
import { getHelperLeadCreditSummary } from '@/utils/helperCreditDisplay';
import { isJobInterestFull } from '@/utils/applicationInterest';
import { getRequestDescriptionForViewer } from '@/utils/requestDescriptionDisplay';
import type { AppLanguage } from '@/services/translationService';
import {
  getApplicationTypeChargeLc,
  getApplicationBalanceSummary,
  getApplicationCreditQuote,
  getOpportunityLocationLabel,
  buildOpportunityCardMetaParts,
  formatOpportunityCardMetaLine,
  canSubmitConfirmedApplication,
  requiresProposalAmountInput,
  resolveDefaultProposalAmount,
  shouldExpandDescriptionForAmountInput,
  HELPER_OPPORTUNITY_CARD_FOOTER_LAYOUT,
  type HelperApplicationType,
} from '@/utils/helperOpportunityApply';
import { validateHelperProposal } from '@/utils/jobProposal';
import { formatLinkCredits } from '@/utils/formatLinkCredits';
import {
  isLinkCreditsDebugEnabled,
  shouldShowHelperOpportunityLcDebugPanel,
} from '@/utils/linkCreditsDebug';
import {
  feedCardViewAfterBack,
  feedCardViewFromDescriptionExpanded,
  type FeedCardView,
} from '@/utils/feedCardView';
import {
  FEED_CARD_CONTENT_CLASS,
  FEED_CARD_FIXED_HEIGHT_EXTRA_PX,
  FEED_CARD_RING_SIZE_PX,
  FEED_CARD_SHELL_CLASS,
  FEED_CARD_STANDARD_CONTENT_HEIGHT_PX,
  FEED_CARD_TOP_ACCENT_CLASS,
  feedCardLockedContentStyle,
} from '@/utils/feedCardFixedHeight';

export type { FeedCardView } from '@/utils/feedCardView';
export type HelperOpportunityCardTab = 'match' | 'recentes' | 'emergencia';

type TFn = (key: string, options?: Record<string, string | number>) => string;
type TranslateFn = (raw: string, t: (key: string) => string) => string;

export type HelperOpportunityCardProps = {
  job: Job;
  activeTab: HelperOpportunityCardTab;
  hasApplied: boolean;
  isApplying: boolean;
  onSubmitApply: (
    job: Job,
    proposedAmount: number,
    options: { isExclusive: boolean },
  ) => void;
  isExiting?: boolean;
  interactionLocked?: boolean;
  proposalOpen?: boolean;
  applicationsCount?: number;
  clientReviewCount?: number;
  t: TFn;
  translateCategory: TranslateFn;
  formatJobSchedule: (job: Job, t: TFn) => string;
  distanceKm?: number | null;
  distanceFromBase?: boolean;
  needsBaseAddress?: boolean;
  baseAddressPendingCoords?: boolean;
  walletBalance?: number | null;
  language?: AppLanguage;
  exclusiveLocked?: boolean;
  descriptionExpanded?: boolean;
  onDescriptionExpandedChange?: (expanded: boolean) => void;
};

function jobMatchTier(job: Job, activeTab: HelperOpportunityCardTab): 'urgent' | 'best' | 'normal' {
  if (job.urgency === 'high') return 'urgent';
  if (activeTab === 'match') {
    const n = job.id.replace(/\D/g, '') || '0';
    const h = Number.parseInt(n.slice(-2), 10) || 0;
    return h % 3 === 0 ? 'best' : 'normal';
  }
  return 'normal';
}

const OPPORTUNITY_RING_SIZE = FEED_CARD_RING_SIZE_PX;

function PremiumMetaDot() {
  return (
    <span className="mx-1.5 shrink-0 select-none text-[10px] font-bold leading-none text-[#CBD5E1]" aria-hidden>
      •
    </span>
  );
}

function clientInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  return (parts[0]?.slice(0, 2) ?? '?').toUpperCase();
}

function HelperOpportunityCardInner({
  job,
  activeTab,
  hasApplied,
  isApplying,
  onSubmitApply,
  isExiting = false,
  interactionLocked = false,
  proposalOpen = false,
  t,
  translateCategory,
  formatJobSchedule: _formatJobSchedule,
  distanceKm,
  distanceFromBase = false,
  needsBaseAddress = false,
  baseAddressPendingCoords = false,
  applicationsCount = 0,
  clientReviewCount = 0,
  walletBalance = null,
  language = 'pt',
  exclusiveLocked = false,
  descriptionExpanded = false,
  onDescriptionExpandedChange,
}: HelperOpportunityCardProps) {
  const [searchParams] = useSearchParams();
  const lcDebugEnabled = isLinkCreditsDebugEnabled(searchParams);
  const tier = jobMatchTier(job, activeTab);
  const category = translateCategory(job.category, t);
  const loc = getOpportunityLocationLabel(
    job,
    distanceKm,
    t,
    distanceFromBase,
    needsBaseAddress,
    baseAddressPendingCoords,
  );
  const openedLabel = formatJobOpenedAt(job.createdAt, t);
  const [view, setView] = useState<FeedCardView>(() =>
    feedCardViewFromDescriptionExpanded(descriptionExpanded),
  );
  const [applicationType, setApplicationType] = useState<HelperApplicationType | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [proposalAmountRaw, setProposalAmountRaw] = useState('');
  const [amountError, setAmountError] = useState('');
  const confirmSubmittedRef = useRef(false);
  const title = translateJobTitle(job.title, job.category, job.subcategory, t);
  const CategoryIcon = getCategoryIconById(job.category);
  const categoryTheme = getCategoryFeedTheme(job.category);
  const showCategoryLine = !title.startsWith(`${category}:`);
  const metaParts = buildOpportunityCardMetaParts(job, t, distanceKm);
  const metaLine = formatOpportunityCardMetaLine(metaParts);
  const creditQuote = getApplicationCreditQuote(job, distanceKm);
  const normalCharge = creditQuote.normalApplyLc;
  const vipCharge = creditQuote.vipApplyLc;
  const balanceSummary = getApplicationBalanceSummary(job, walletBalance, distanceKm);
  const leadCreditSummary = getHelperLeadCreditSummary(job, distanceKm);
  const leadCreditBreakdown = creditQuote;
  const resolvedCategoryId = resolveCategoryId(job.category) || job.category;
  const normalLabelCount = formatLinkCredits(normalCharge, language);
  const vipLabelCount = formatLinkCredits(vipCharge, language);
  const showLcDebugPanel = shouldShowHelperOpportunityLcDebugPanel(
    lcDebugEnabled,
    view === 'description',
  );

  useEffect(() => {
    if (!lcDebugEnabled) return;
    console.debug('[HelperOpportunityCard LC trace]', {
      jobId: job.id,
      jobCategory: job.category,
      distanceKm,
      normalCharge,
      vipCharge,
      balanceSummary,
      leadCreditSummary,
      leadCreditBreakdown,
      serviceCost: leadCreditBreakdown.serviceCost,
      distanceCost: leadCreditBreakdown.distanceCost,
      estimatedTotal: leadCreditBreakdown.estimatedTotal,
      interestCost: leadCreditBreakdown.interestCost,
    });
  }, [
    lcDebugEnabled,
    job.id,
    job.category,
    distanceKm,
    normalCharge,
    vipCharge,
    balanceSummary,
    leadCreditSummary,
    leadCreditBreakdown,
  ]);

  const isInterestFull = isJobInterestFull(applicationsCount);
  const isInternalView = view !== 'summary';
  const canApply = !hasApplied && !isApplying && !isInterestFull && !interactionLocked;
  const requestDescription = getRequestDescriptionForViewer(job.description, language);
  const showAmountInput = requiresProposalAmountInput(job);

  useEffect(() => {
    setView(feedCardViewFromDescriptionExpanded(descriptionExpanded));
  }, [descriptionExpanded]);

  useEffect(() => {
    if (!showAmountInput) return;
    const defaultAmount = resolveDefaultProposalAmount(job);
    if (defaultAmount != null && !proposalAmountRaw) {
      setProposalAmountRaw(String(defaultAmount));
    }
  }, [job.id, showAmountInput, proposalAmountRaw]);

  useEffect(() => {
    if (!confirmOpen) confirmSubmittedRef.current = false;
  }, [confirmOpen]);

  useEffect(() => {
    if (hasApplied) {
      setConfirmOpen(false);
      setView('summary');
    }
  }, [hasApplied]);

  useEffect(() => {
    if (!isApplying) {
      setConfirmOpen(false);
    }
  }, [isApplying]);

  const goToView = (next: FeedCardView) => {
    setView(next);
    onDescriptionExpandedChange?.(next === 'description');
  };

  const goBackToSummary = () => {
    setView(feedCardViewAfterBack(view));
    onDescriptionExpandedChange?.(false);
  };

  const resolveProposalAmount = (): number | null => {
    const raw = showAmountInput ? proposalAmountRaw : String(resolveDefaultProposalAmount(job) ?? '');
    const result = validateHelperProposal(raw, job, true);
    if (result.ok === false) {
      setAmountError(t(result.messageKey, result.messageVars));
      return null;
    }
    setAmountError('');
    return result.amount;
  };

  const openConfirmWithType = (type: HelperApplicationType) => {
    if (!canApply) return;
    if (type === 'exclusive' && exclusiveLocked) return;
    const charge =
      type === 'exclusive'
        ? balanceSummary.vip.charge
        : balanceSummary.normal.charge;
    if (walletBalance != null && walletBalance < charge) return;
    setApplicationType(type);
    if (shouldExpandDescriptionForAmountInput(showAmountInput, proposalAmountRaw)) {
      goToView('description');
      setAmountError(t('helper_proposal.error_required'));
      return;
    }
    setConfirmOpen(true);
  };

  const handleExternalNormalApply = () => {
    if (!canApply) return;
    hapticSuccess();
    openConfirmWithType('normal');
  };

  const handleExternalVipApply = () => {
    if (!canApply || exclusiveLocked) return;
    hapticSuccess();
    openConfirmWithType('exclusive');
  };

  const handleConfirm = () => {
    if (!canSubmitConfirmedApplication({
      applicationType,
      isApplying,
      alreadySubmitted: confirmSubmittedRef.current,
    })) {
      return;
    }
    const amount = resolveProposalAmount();
    if (amount == null || !applicationType) return;
    confirmSubmittedRef.current = true;
    onSubmitApply(job, amount, { isExclusive: applicationType === 'exclusive' });
  };

  const handleConfirmCancel = () => {
    if (isApplying) return;
    setConfirmOpen(false);
  };

  const ctaBase =
    'inline-flex min-h-[44px] min-w-0 items-center justify-center gap-1.5 rounded-[14px] px-3 py-2.5 text-[12px] font-bold leading-snug transition-all duration-200 sm:min-h-[42px] sm:px-4 sm:text-[13px]';

  const interestRingLabel = t('helper_dashboard.interested_ring_label');

  const renderApplyActionRow = () => {
    const normalDisabled =
      !canApply || (walletBalance != null && !balanceSummary.normal.canAfford);
    const vipDisabled =
      !canApply || exclusiveLocked || (walletBalance != null && !balanceSummary.vip.canAfford);

    const normalBtn = clsx(
      ctaBase,
      'flex-1 bg-gradient-to-br from-[#2563FF] to-[#1557F0] text-white shadow-[0_8px_22px_rgba(37,99,255,0.28),inset_0_1px_0_rgba(255,255,255,0.18)]',
      'hover:shadow-[0_12px_30px_rgba(37,99,255,0.36)] hover:brightness-105 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50',
    );
    const vipBtn = clsx(
      ctaBase,
      'w-[5.25rem] shrink-0 border border-amber-200/90 bg-gradient-to-br from-amber-50 to-white text-amber-900 shadow-[0_4px_14px_rgba(245,158,11,0.14)] sm:w-[5.75rem]',
      'hover:border-amber-300 hover:from-amber-100 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50',
    );

    if (hasApplied) {
      return (
        <span
          className={clsx(
            ctaBase,
            'w-full cursor-default gap-2 rounded-[14px] border border-emerald-200/80 bg-emerald-50 text-emerald-700',
          )}
        >
          <CheckCircle2 className="h-[18px] w-[18px] shrink-0" />
          <span>{t('helper_dashboard.applied_sent')}</span>
        </span>
      );
    }

    if (isApplying) {
      return (
        <button type="button" disabled className={clsx(normalBtn, 'w-full flex-1')}>
          <Icons.Loader2 className="h-[18px] w-[18px] animate-spin" />
        </button>
      );
    }

    if (isInterestFull) {
      return (
        <span
          className={clsx(
            ctaBase,
            'w-full cursor-default rounded-[14px] border border-slate-200 bg-slate-50 px-4 text-center text-[13px] font-semibold leading-tight text-slate-500',
          )}
        >
          {t('helper_dashboard.interested_limit_reached')}
        </span>
      );
    }

    return (
      <div className="flex w-full min-w-0 items-stretch gap-2" data-layout={HELPER_OPPORTUNITY_CARD_FOOTER_LAYOUT}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleExternalNormalApply();
          }}
          onTouchEnd={(e) => e.stopPropagation()}
          disabled={normalDisabled}
          className={normalBtn}
          aria-label={t('helper_dashboard.apply_confirm_action')}
        >
          <Icons.Send className="h-[15px] w-[15px] shrink-0" strokeWidth={2.25} aria-hidden />
          <span className="whitespace-nowrap text-center">{t('helper_dashboard.apply_confirm_action')}</span>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleExternalVipApply();
          }}
          onTouchEnd={(e) => e.stopPropagation()}
          disabled={vipDisabled}
          className={vipBtn}
          aria-label={t('helper_dashboard.apply_type_exclusive')}
        >
          <span aria-hidden className="shrink-0 text-[13px] leading-none">
            👑
          </span>
          <span className="whitespace-nowrap">{t('helper_dashboard.apply_vip_short')}</span>
        </button>
      </div>
    );
  };

  const renderPremiumBackBar = () => (
    <div className={FEED_CARD_PREMIUM_TOP_BAR_CLASS} data-testid="feed-card-premium-top-bar">
      <button
        type="button"
        data-testid="feed-card-back"
        onClick={(e) => {
          e.stopPropagation();
          goBackToSummary();
        }}
        className={FEED_CARD_PREMIUM_BACK_CLASS}
      >
        <Icons.ArrowLeft className={FEED_CARD_PREMIUM_ICON_WHITE_CLASS} aria-hidden />
        {t('nav.back')}
      </button>
    </div>
  );

  const renderDescriptionView = () => {
    const vipSurchargeLc = Math.max(0, creditQuote.vipApplyLc - creditQuote.fullRequestLc);
    const quoteAvailable =
      Number.isFinite(creditQuote.normalApplyLc) &&
      Number.isFinite(creditQuote.normalHireRemainderLc) &&
      Number.isFinite(creditQuote.fullRequestLc) &&
      Number.isFinite(creditQuote.vipApplyLc);

    return (
      <div
        className="relative flex h-full min-h-0 flex-col opacity-100 transition-opacity duration-200 ease-out"
        data-testid="feed-card-description-view"
      >
        {renderPremiumBackBar()}
        <div className={clsx(FEED_CARD_PREMIUM_SCROLL_CLASS, 'space-y-2.5')}>
          <p className={FEED_CARD_PREMIUM_EYEBROW_CLASS}>
            {t('helper_dashboard.feed_card_details_title')}
          </p>
          <h3 className={FEED_CARD_PREMIUM_TITLE_CLASS}>{title}</h3>
          {requestDescription.display ? (
            <p className={clsx('whitespace-pre-wrap', FEED_CARD_PREMIUM_BODY_CLASS)}>
              {requestDescription.display}
            </p>
          ) : (
            <p className={FEED_CARD_PREMIUM_MUTED_CLASS}>
              {t('helper_dashboard.feed_card_no_description')}
            </p>
          )}

          <div className={FEED_CARD_PREMIUM_SURFACE_CLASS}>
            <div className="flex min-w-0 items-center gap-1.5 text-[12px] font-semibold text-white/85">
              <Icons.Wrench className={FEED_CARD_PREMIUM_ICON_WHITE_CLASS} aria-hidden />
              <span className="truncate">{category}</span>
            </div>
            <div className="flex min-w-0 items-center gap-1.5 text-[12px] font-bold text-white">
              <Icons.Link2 className={FEED_CARD_PREMIUM_ICON_WHITE_CLASS} aria-hidden />
              <span className="truncate">
                {t('helper_dashboard.feed_card_budget')}: {metaParts.budget}
              </span>
            </div>
            {metaParts.distance ? (
              <div className="flex min-w-0 items-center gap-1.5 text-[12px] font-semibold text-white/85">
                <Icons.Navigation className={FEED_CARD_PREMIUM_ICON_LIGHT_CLASS} aria-hidden />
                <span className="truncate">
                  {t('helper_dashboard.feed_card_distance')}: {metaParts.distance}
                </span>
              </div>
            ) : null}
            {metaParts.modality ? (
              <div className="flex min-w-0 items-center gap-1.5 text-[12px] font-semibold text-white/85">
                <Icons.Laptop className={FEED_CARD_PREMIUM_ICON_WHITE_CLASS} aria-hidden />
                <span className="truncate">
                  {t('helper_dashboard.feed_card_modality')}: {metaParts.modality}
                </span>
              </div>
            ) : null}
            {metaParts.schedule ? (
              <div className="flex min-w-0 items-center gap-1.5 text-[12px] font-semibold text-white/85">
                <Icons.Calendar className={FEED_CARD_PREMIUM_ICON_WHITE_CLASS} aria-hidden />
                <span className="truncate">
                  {t('helper_dashboard.feed_card_schedule')}: {metaParts.schedule}
                </span>
              </div>
            ) : null}
            {loc ? (
              <div className="flex min-w-0 items-center gap-1.5 text-[12px] font-semibold text-white/85">
                <Icons.MapPin className={FEED_CARD_PREMIUM_ICON_LIGHT_CLASS} aria-hidden />
                <span className="truncate">
                  {t('helper_dashboard.feed_card_location')}: {loc}
                </span>
              </div>
            ) : null}
            <div className="flex min-w-0 items-center gap-1.5 text-[12px] font-semibold text-white/85">
              <Icons.Users className={FEED_CARD_PREMIUM_ICON_WHITE_CLASS} aria-hidden />
              <span className="truncate">
                {t('helper_dashboard.feed_card_interested', { count: applicationsCount })}
              </span>
            </div>
          </div>

          {quoteAvailable ? (
            <div className="space-y-2" data-testid="feed-card-lc-quote">
              <div className={FEED_CARD_PREMIUM_QUOTE_NORMAL_CLASS}>
                <p className="text-[10px] font-black uppercase tracking-wide text-sky-100/90">
                  {t('helper_dashboard.apply_type_normal')}
                </p>
                <p className="mt-0.5 text-[12px] font-bold text-white">
                  {t('helper_dashboard.split_normal_cost_now', { count: creditQuote.normalApplyLc })}
                </p>
                <p className="text-[11px] font-semibold text-white/80">
                  {t('helper_dashboard.split_normal_if_hired', {
                    count: creditQuote.normalHireRemainderLc,
                  })}
                </p>
                <p className="text-[11px] font-semibold text-white/80">
                  {t('helper_dashboard.split_normal_total', { count: creditQuote.fullRequestLc })}
                </p>
              </div>
              <div className={FEED_CARD_PREMIUM_QUOTE_VIP_CLASS}>
                <p className="text-[10px] font-black uppercase tracking-wide text-amber-100/90">
                  {t('helper_dashboard.apply_type_exclusive')}
                </p>
                <p className="mt-0.5 text-[12px] font-bold text-white">
                  {t('helper_dashboard.split_vip_cost_now', { count: creditQuote.vipApplyLc })}
                </p>
                <p className="text-[11px] font-semibold text-white/85">
                  {t('helper_dashboard.split_vip_breakdown', {
                    full: creditQuote.fullRequestLc,
                    surcharge: vipSurchargeLc,
                  })}
                </p>
                <p className="mt-0.5 text-[11px] font-semibold text-white/75">
                  {t('helper_dashboard.feed_card_vip_no_hire_charge')}
                </p>
              </div>
            </div>
          ) : (
            <p
              className="text-[12px] font-semibold text-white/55"
              data-testid="feed-card-lc-unavailable"
            >
              {t('helper_dashboard.feed_card_quote_unavailable')}
            </p>
          )}

          {showAmountInput ? (
            <div>
              <label className="mb-1 block text-[11px] font-bold text-white/80">
                {t('helper_proposal.your_proposal')}
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={proposalAmountRaw}
                onChange={(e) => {
                  setProposalAmountRaw(e.target.value.replace(/[^\d.,]/g, ''));
                  setAmountError('');
                }}
                className={FEED_CARD_PREMIUM_INPUT_CLASS}
                placeholder={t('helper_proposal.amount_placeholder')}
              />
              {amountError ? (
                <p className="mt-1 text-[11px] font-semibold text-rose-300">{amountError}</p>
              ) : null}
            </div>
          ) : null}

          {showLcDebugPanel ? (
            <HelperOpportunityLcDebugPanel
              jobId={job.id}
              rawCategory={job.category}
              resolvedCategoryId={resolvedCategoryId}
              distanceKm={distanceKm}
              creditQuote={creditQuote}
              walletBalance={walletBalance}
              normalLabelCount={normalLabelCount}
              vipLabelCount={vipLabelCount}
            />
          ) : null}
        </div>
      </div>
    );
  };

  const renderProfileView = () => (
    <div
      className="relative flex h-full min-h-0 flex-col opacity-100 transition-opacity duration-200 ease-out"
      data-testid="feed-card-profile-view"
    >
      {renderPremiumBackBar()}
      <div className={FEED_CARD_PREMIUM_SCROLL_CLASS}>
        <p className={clsx('mb-2', FEED_CARD_PREMIUM_EYEBROW_CLASS)}>
          {t('helper_dashboard.feed_card_profile_title')}
        </p>
        {view === 'profile' ? <FeedCardClientProfilePanel job={job} /> : null}
      </div>
    </div>
  );

  const renderPremiumMetaLine = () => (
    <div className="min-w-0 text-[12px] leading-[1.35] line-clamp-2 sm:line-clamp-1 sm:text-[12px]">
      <span
        className="inline-flex max-w-full items-center gap-1 font-bold"
        style={{ color: categoryTheme.budgetColor }}
      >
        <Icons.Link2 className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
        <span>{metaParts.budget}</span>
      </span>
      {metaParts.distance ? (
        <>
          <PremiumMetaDot />
          <span className="inline-flex items-center gap-1 font-semibold text-[#64748B]">
            <Icons.MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
            <span>{metaParts.distance}</span>
          </span>
        </>
      ) : null}
      {metaParts.modality ? (
        <>
          <PremiumMetaDot />
          <span className="inline-flex items-center gap-1 font-semibold text-[#64748B]">
            <Icons.Laptop className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
            <span>{metaParts.modality}</span>
          </span>
        </>
      ) : null}
      {metaParts.schedule ? (
        <>
          <PremiumMetaDot />
          <span className="inline-flex items-center gap-1 font-semibold text-[#64748B]">
            <Icons.Calendar className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
            <span>{metaParts.schedule}</span>
          </span>
        </>
      ) : null}
    </div>
  );

  const feedBody = (
    <div className="grid w-full min-w-0 grid-cols-[48px_minmax(0,1fr)_68px] grid-rows-[auto_auto_auto] gap-x-2 gap-y-1 sm:grid-cols-[56px_minmax(0,1fr)_68px] sm:gap-x-2.5 sm:gap-y-1">
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
        <h3 className="line-clamp-2 text-[15px] font-bold leading-[1.28] text-[#0F172A] sm:text-[17px] sm:leading-[1.3]">
          {title}
        </h3>
      </div>

      <div className="col-start-2 row-start-2 min-w-0 self-start">
        {showCategoryLine ? (
          <div className="mb-0.5 flex min-w-0 items-center gap-1.5">
            <span
              className="h-[6px] w-[6px] shrink-0 rounded-full"
              style={{ backgroundColor: categoryTheme.dotColor }}
            />
            <span className="truncate text-[11px] font-medium text-[#94A3B8]">{category}</span>
          </div>
        ) : null}
        {renderPremiumMetaLine()}
      </div>

      <div className="col-start-3 row-start-1 row-span-2 flex shrink-0 items-center justify-center self-center pt-0.5">
        <InterestedRing interestedCount={applicationsCount} label={interestRingLabel} size={OPPORTUNITY_RING_SIZE} />
      </div>

      <div className="relative col-span-3 col-start-1 row-start-3 mt-0.5 flex flex-col gap-1.5 border-t border-[rgba(15,23,42,0.06)] pt-2">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            data-testid="feed-card-open-profile"
            onClick={(e) => {
              e.stopPropagation();
              goToView('profile');
            }}
            className="flex min-w-0 max-w-[42%] items-center gap-2 rounded-full py-0.5 pr-1 text-left transition hover:opacity-90"
            aria-label={t('helper_public.view_profile')}
            aria-expanded={view === 'profile'}
          >
            {job.clientAvatar && !job.clientAvatar.includes('pravatar') ? (
              <img
                src={job.clientAvatar}
                alt=""
                className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-white shadow-sm"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-2 ring-white shadow-sm"
                style={{
                  backgroundColor: categoryTheme.iconBg,
                  color: categoryTheme.iconColor,
                }}
              >
                {clientInitials(job.clientName)}
              </div>
            )}
            <span className="min-w-0 truncate text-[11px] font-bold text-[#64748B]">
              {job.clientName}
            </span>
          </button>
          <button
            type="button"
            data-testid="feed-card-open-description"
            onClick={(e) => {
              e.stopPropagation();
              goToView('description');
            }}
            className="inline-flex min-h-[44px] min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border border-[rgba(15,23,42,0.08)] bg-[#f8fafc] px-3 py-2 text-[12px] font-bold text-[#0F172A] transition hover:bg-slate-50"
            aria-expanded={view === 'description'}
          >
            <Icons.FileText className="h-3.5 w-3.5 shrink-0 text-[#64748B]" aria-hidden />
            <span className="truncate">{t('helper_dashboard.apply_description_label')}</span>
            <Icons.ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#64748B]" aria-hidden />
          </button>
        </div>

        <div className="relative z-40">{renderApplyActionRow()}</div>
      </div>

      <div className="sr-only">
        {metaLine} {loc} {openedLabel} {title} {applicationsCount}
      </div>
    </div>
  );

  const cardShell = clsx(
    FEED_CARD_SHELL_CLASS,
    'md:hover:-translate-y-1 md:hover:shadow-[0_12px_40px_rgba(15,23,42,0.10)] motion-reduce:transform-none',
    isExiting &&
      'pointer-events-none scale-[0.88] opacity-0 -translate-x-8 -rotate-2 duration-[520ms] ease-[cubic-bezier(0.34,1.15,0.64,1)]',
    tier === 'urgent'
      ? 'border-rose-200/80'
      : tier === 'best'
        ? 'border-emerald-200/70'
        : null,
  );

  const topAccent = (
    <div
      className={FEED_CARD_TOP_ACCENT_CLASS}
      style={{
        background: `linear-gradient(90deg, ${categoryTheme.iconColor} 0%, ${categoryTheme.iconColor}55 55%, transparent 100%)`,
      }}
      aria-hidden
    />
  );

  return (
    <>
      <LhCard padding="none" className={cardShell}>
        {topAccent}
        <div
          data-feed-card-view={view}
          data-feed-card-height-locked="true"
          data-feed-card-height-extra={FEED_CARD_FIXED_HEIGHT_EXTRA_PX}
          data-feed-card-standard-height={FEED_CARD_STANDARD_CONTENT_HEIGHT_PX}
          className={FEED_CARD_CONTENT_CLASS}
          style={feedCardLockedContentStyle()}
        >
          <div
            className={clsx(isInternalView && 'invisible pointer-events-none select-none')}
            aria-hidden={isInternalView}
          >
            {feedBody}
          </div>
          {isInternalView ? (
            <div className={FEED_CARD_PREMIUM_SHELL_CLASS} data-testid="feed-card-premium-shell">
              {view === 'description' ? renderDescriptionView() : null}
              {view === 'profile' ? renderProfileView() : null}
            </div>
          ) : null}
        </div>
      </LhCard>

      {applicationType && confirmOpen ? (
        <HelperApplyConfirmModal
          open={confirmOpen}
          submitting={isApplying}
          applicationType={applicationType}
          linkCreditsCost={getApplicationTypeChargeLc(job, applicationType, distanceKm)}
          creditQuote={creditQuote}
          walletBalance={walletBalance}
          language={language}
          onConfirm={handleConfirm}
          onCancel={handleConfirmCancel}
          t={t}
        />
      ) : null}
    </>
  );
}

export const HelperOpportunityCard = memo(HelperOpportunityCardInner, (prev, next) => {
  return (
    prev.job.id === next.job.id &&
    prev.job.createdAt === next.job.createdAt &&
    prev.job.title === next.job.title &&
    prev.job.urgency === next.job.urgency &&
    prev.job.status === next.job.status &&
    prev.job.clientAvatar === next.job.clientAvatar &&
    prev.job.clientRating === next.job.clientRating &&
    prev.hasApplied === next.hasApplied &&
    prev.isApplying === next.isApplying &&
    prev.isExiting === next.isExiting &&
    prev.interactionLocked === next.interactionLocked &&
    prev.proposalOpen === next.proposalOpen &&
    prev.activeTab === next.activeTab &&
    prev.distanceKm === next.distanceKm &&
    prev.distanceFromBase === next.distanceFromBase &&
    prev.needsBaseAddress === next.needsBaseAddress &&
    prev.applicationsCount === next.applicationsCount &&
    prev.clientReviewCount === next.clientReviewCount &&
    prev.exclusiveLocked === next.exclusiveLocked &&
    prev.descriptionExpanded === next.descriptionExpanded &&
    prev.language === next.language
  );
});
