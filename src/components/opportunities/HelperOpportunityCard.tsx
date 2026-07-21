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
import { ClientPublicProfileView } from '@/components/features/ClientPublicProfileView';
import { HelperOpportunityLcDebugPanel } from '@/components/opportunities/HelperOpportunityLcDebugPanel';
import { getHelperLeadCreditSummary } from '@/utils/helperCreditDisplay';
import { isJobInterestFull } from '@/utils/applicationInterest';
import { getRequestDescriptionForViewer } from '@/utils/requestDescriptionDisplay';
import type { AppLanguage } from '@/services/translationService';
import {
  getApplicationTypeChargeLc,
  getApplicationTypeLabelKey,
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

const OPPORTUNITY_RING_SIZE = 68;

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
  const [descriptionOpen, setDescriptionOpen] = useState(descriptionExpanded);
  const [clientPanelOpen, setClientPanelOpen] = useState(false);
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
  const showLcDebugPanel = shouldShowHelperOpportunityLcDebugPanel(lcDebugEnabled, descriptionOpen);

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
  const cardPanelOpen = descriptionOpen || clientPanelOpen;
  const canApply = !hasApplied && !isApplying && !isInterestFull && !interactionLocked;
  const requestDescription = getRequestDescriptionForViewer(job.description, language);
  const showAmountInput = requiresProposalAmountInput(job);

  useEffect(() => {
    setDescriptionOpen(descriptionExpanded);
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
      setDescriptionOpen(false);
      setClientPanelOpen(false);
    }
  }, [hasApplied]);

  useEffect(() => {
    if (!isApplying) {
      setConfirmOpen(false);
    }
  }, [isApplying]);

  const setDescription = (open: boolean) => {
    setDescriptionOpen(open);
    if (open) setClientPanelOpen(false);
    onDescriptionExpandedChange?.(open);
  };

  const setClientPanel = (open: boolean) => {
    setClientPanelOpen(open);
    if (open) {
      setDescriptionOpen(false);
      onDescriptionExpandedChange?.(false);
    }
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
      setDescription(true);
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

  const renderExpandedDescriptionContent = () => (
    <div className="space-y-2.5">
      {requestDescription.display ? (
        <p className="whitespace-pre-wrap text-[13px] font-medium leading-relaxed text-[#475569]">
          {requestDescription.display}
        </p>
      ) : (
        <p className="text-[13px] font-medium text-[#94A3B8]">{t('helper_dashboard.apply_no_description')}</p>
      )}

      <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#64748B]">
        <Icons.MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>{loc}</span>
      </div>

      <p className="text-[13px] font-bold text-[#0F172A]">
        {walletBalance == null
          ? t('helper_dashboard.apply_wallet_balance_loading')
          : t('helper_dashboard.apply_wallet_balance', {
              count: formatLinkCredits(walletBalance, language),
            })}
      </p>

      <div className="space-y-2">
        <div
          className={clsx(
            'rounded-lg border px-2.5 py-2',
            balanceSummary.normal.canAfford
              ? 'border-blue-100 bg-blue-50/80'
              : 'border-rose-200 bg-rose-50/80',
          )}
        >
          <p className="text-[10px] font-black uppercase tracking-wide text-blue-700/80">
            {t('helper_dashboard.apply_type_normal')}
          </p>
          <p className="mt-0.5 text-[12px] font-bold text-blue-900">
            {t('helper_dashboard.split_normal_cost_now', { count: normalCharge })}
          </p>
          <p className="text-[11px] font-semibold text-blue-800/90">
            {t('helper_dashboard.split_normal_if_hired', { count: creditQuote.normalHireRemainderLc })}
          </p>
          <p className="text-[11px] font-semibold text-blue-800/90">
            {t('helper_dashboard.split_normal_total', { count: creditQuote.fullRequestLc })}
          </p>
          <p className="mt-0.5 text-[11px] font-semibold text-[#64748B]">
            {walletBalance == null
              ? t('helper_dashboard.apply_balance_after_loading')
              : balanceSummary.normal.canAfford
                ? t('helper_dashboard.apply_balance_after', {
                    count: formatLinkCredits(balanceSummary.normal.balanceAfter ?? 0, language),
                  })
                : t('helper_dashboard.apply_insufficient_lc')}
          </p>
        </div>

        <div
          className={clsx(
            'rounded-lg border px-2.5 py-2',
            balanceSummary.vip.canAfford
              ? 'border-amber-200 bg-amber-50/80'
              : 'border-rose-200 bg-rose-50/80',
          )}
        >
          <p className="text-[10px] font-black uppercase tracking-wide text-amber-800/80">
            {t('helper_dashboard.apply_type_exclusive')}
          </p>
          <p className="mt-0.5 text-[12px] font-bold text-amber-900">
            {t('helper_dashboard.split_vip_cost_now', { count: vipCharge })}
          </p>
          <p className="text-[11px] font-semibold text-amber-900/90">
            {t('helper_dashboard.split_vip_breakdown', {
              full: creditQuote.fullRequestLc,
              surcharge: 4,
            })}
          </p>
          <p className="mt-0.5 text-[11px] font-semibold text-[#64748B]">
            {walletBalance == null
              ? t('helper_dashboard.apply_balance_after_loading')
              : balanceSummary.vip.canAfford
                ? t('helper_dashboard.apply_balance_after', {
                    count: formatLinkCredits(balanceSummary.vip.balanceAfter ?? 0, language),
                  })
                : t('helper_dashboard.apply_insufficient_lc')}
          </p>
        </div>
      </div>

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

      <p className="text-[11px] font-medium leading-relaxed text-[#64748B]">
        {t('helper_dashboard.apply_vip_explain')}
      </p>

      {exclusiveLocked ? (
        <p className="text-[11px] font-medium text-amber-700">
          {t('helper_dashboard.exclusive_application_locked')}
        </p>
      ) : null}

      {showAmountInput ? (
        <div>
          <label className="mb-1 block text-[11px] font-bold text-[#64748B]">
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
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-[#0F172A] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/10"
            placeholder={t('helper_proposal.amount_placeholder')}
          />
          {amountError ? <p className="mt-1 text-[11px] font-semibold text-rose-600">{amountError}</p> : null}
        </div>
      ) : null}
    </div>
  );

  const renderCardOverlay = () => {
    if (!cardPanelOpen) return null;

    const panelTitle = descriptionOpen
      ? t('helper_dashboard.apply_description_label')
      : t('helper_public.view_profile');

    return (
      <div
        className="absolute inset-x-0 bottom-[52px] z-30 flex max-h-[min(220px,42vh)] flex-col overflow-hidden rounded-xl border border-[rgba(15,23,42,0.10)] bg-white shadow-[0_10px_36px_rgba(15,23,42,0.14)]"
        role="dialog"
        aria-label={panelTitle}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[rgba(15,23,42,0.06)] px-2.5 py-2">
          <p className="min-w-0 truncate text-[11px] font-black uppercase tracking-wide text-[#64748B]">
            {panelTitle}
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDescription(false);
              setClientPanel(false);
            }}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#64748B] transition hover:bg-slate-100"
            aria-label={t('common.close')}
          >
            <Icons.X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="ios-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-2.5 py-2.5">
          {descriptionOpen ? renderExpandedDescriptionContent() : <ClientPublicProfileView job={job} />}
        </div>
      </div>
    );
  };

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
        <div className={clsx('flex min-w-0 items-center gap-2', cardPanelOpen && 'pointer-events-none opacity-0')}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setClientPanel(!clientPanelOpen);
            }}
            className={clsx(
              'shrink-0 rounded-full ring-2 ring-white shadow-sm transition hover:opacity-90',
              clientPanelOpen && 'ring-blue-200',
            )}
            aria-label={t('helper_public.view_profile')}
            aria-expanded={clientPanelOpen}
          >
            {job.clientAvatar && !job.clientAvatar.includes('pravatar') ? (
              <img
                src={job.clientAvatar}
                alt=""
                className="h-9 w-9 rounded-full object-cover"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold"
                style={{
                  backgroundColor: categoryTheme.iconBg,
                  color: categoryTheme.iconColor,
                }}
              >
                {clientInitials(job.clientName)}
              </div>
            )}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDescription(!descriptionOpen);
            }}
            className={clsx(
              'inline-flex min-h-[44px] min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border border-[rgba(15,23,42,0.08)] bg-[#f8fafc] px-3 py-2 text-[12px] font-bold text-[#0F172A] transition hover:bg-slate-50',
              descriptionOpen && 'border-blue-200 bg-blue-50/60',
            )}
            aria-expanded={descriptionOpen}
          >
            <Icons.FileText className="h-3.5 w-3.5 shrink-0 text-[#64748B]" aria-hidden />
            <span className="truncate">{t('helper_dashboard.apply_description_label')}</span>
            <Icons.ChevronDown
              className={clsx(
                'h-3.5 w-3.5 shrink-0 text-[#64748B] transition-transform duration-200',
                descriptionOpen && 'rotate-180',
              )}
              aria-hidden
            />
          </button>
        </div>

        {renderCardOverlay()}

        <div className="relative z-40">{renderApplyActionRow()}</div>
      </div>

      <div className="sr-only">
        {metaLine} {loc} {openedLabel} {title} {applicationsCount}
      </div>
    </div>
  );

  const cardShell = clsx(
    'group/card relative h-full w-full max-w-full overflow-visible rounded-[22px] border bg-white transition-all duration-300',
    'shadow-[0_2px_12px_rgba(15,23,42,0.05),0_6px_28px_rgba(15,23,42,0.06)]',
    'md:hover:-translate-y-1 md:hover:shadow-[0_12px_40px_rgba(15,23,42,0.10)] motion-reduce:transform-none',
    isExiting &&
      'pointer-events-none scale-[0.88] opacity-0 -translate-x-8 -rotate-2 duration-[520ms] ease-[cubic-bezier(0.34,1.15,0.64,1)]',
    tier === 'urgent'
      ? 'border-rose-200/80'
      : tier === 'best'
        ? 'border-emerald-200/70'
        : 'border-[rgba(15,23,42,0.08)]',
  );

  const topAccent = (
    <div
      className="h-[4px] w-full shrink-0 rounded-t-[22px]"
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
        <div className="relative z-20 bg-white px-3 pb-2.5 pt-2.5 sm:px-4 sm:pb-3 sm:pt-3">
          {feedBody}
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
