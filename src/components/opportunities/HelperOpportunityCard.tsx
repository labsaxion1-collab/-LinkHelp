import { memo, useEffect, useRef, useState } from 'react';
import { hapticLight, hapticSuccess } from '@/utils/haptic';
import * as Icons from 'lucide-react';
import { CheckCircle2 } from 'lucide-react';
import { getCategoryIconById } from '@/utils/categoryIcons';
import { clsx } from 'clsx';
import type { Job } from '@/types/job';
import { formatJobBudgetAmount } from '@/utils/formatJobBudget';
import { formatJobOpenedAt } from '@/utils/jobDisplay';
import { getCategoryFeedTheme } from '@/utils/categoryFeedTheme';
import { translateJobTitle } from '@/utils/translateCategory';
import { LhCard } from '@/components/design-system/LhCard';
import { HelperCreditCostBlock } from '@/components/helpers/HelperCreditCostBlock';
import { InterestedRing } from '@/components/opportunities/InterestedRing';
import { isRemoteJob } from '@/utils/calculateHelperLeadCreditCost';
import { isJobInterestFull } from '@/utils/applicationInterest';

export type HelperOpportunityCardTab = 'match' | 'recentes' | 'emergencia';

type TFn = (key: string, options?: Record<string, string | number>) => string;
type TranslateFn = (raw: string, t: (key: string) => string) => string;

export type HelperOpportunityCardProps = {
  job: Job;
  activeTab: HelperOpportunityCardTab;
  hasApplied: boolean;
  isApplying: boolean;
  onApply: (job: Job) => void;
  onSwipeInterest?: (job: Job) => void;
  onDismiss?: (jobId: string) => void;
  isExiting?: boolean;
  interactionLocked?: boolean;
  proposalOpen?: boolean;
  swipeRateLimited?: boolean;
  onViewClientProfile?: (job: Job) => void;
  onViewDetails?: (job: Job) => void;
  applicationsCount?: number;
  clientReviewCount?: number;
  t: TFn;
  translateCategory: TranslateFn;
  formatJobSchedule: (job: Job, t: TFn) => string;
  distanceKm?: number | null;
  distanceFromBase?: boolean;
  needsBaseAddress?: boolean;
  baseAddressPendingCoords?: boolean;
};

const SWIPE_COMMIT_PX = 90;

function jobMatchTier(job: Job, activeTab: HelperOpportunityCardTab): 'urgent' | 'best' | 'normal' {
  if (job.urgency === 'high') return 'urgent';
  if (activeTab === 'match') {
    const n = job.id.replace(/\D/g, '') || '0';
    const h = Number.parseInt(n.slice(-2), 10) || 0;
    return h % 3 === 0 ? 'best' : 'normal';
  }
  return 'normal';
}

function locationLabel(
  job: Job,
  distanceKm: number | null | undefined,
  t: TFn,
  distanceFromBase?: boolean,
  needsBaseAddress?: boolean,
  baseAddressPendingCoords?: boolean,
): string {
  if (isRemoteJob(job)) return t('jobs.remote');
  if (needsBaseAddress) return t('helper_dashboard.base_address_missing_short');
  if (baseAddressPendingCoords) return t('helper_dashboard.base_address_saved_pending_coords');
  if (distanceKm != null) {
    return distanceFromBase
      ? t('helper_dashboard.distance_from_base_km', { km: distanceKm.toFixed(1) })
      : t('helper_dashboard.distance_km', { km: distanceKm.toFixed(1) });
  }
  const loc = job.location?.trim();
  if (!loc || /remot|remote|en ligne|online/i.test(loc)) return t('jobs.remote');
  return loc.length > 28 ? `${loc.slice(0, 26)}…` : loc;
}

function clientInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  return (parts[0]?.slice(0, 2) ?? '?').toUpperCase();
}

function clientLocationDisplay(job: Job, fallback: string): string {
  const parts = [job.city?.trim(), job.region?.trim()].filter(Boolean);
  if (parts.length) return parts.join(', ');
  return fallback;
}

function HelperOpportunityCardInner({
  job,
  activeTab,
  hasApplied,
  isApplying,
  onApply,
  onSwipeInterest,
  onDismiss,
  isExiting = false,
  interactionLocked = false,
  proposalOpen = false,
  swipeRateLimited = false,
  onViewClientProfile,
  onViewDetails,
  t,
  translateCategory,
  formatJobSchedule,
  distanceKm,
  distanceFromBase = false,
  needsBaseAddress = false,
  baseAddressPendingCoords = false,
  applicationsCount = 0,
  clientReviewCount = 0,
}: HelperOpportunityCardProps) {
  const tier = jobMatchTier(job, activeTab);
  const schedule = formatJobSchedule(job, t);
  const category = translateCategory(job.category, t);
  const loc = locationLabel(job, distanceKm, t, distanceFromBase, needsBaseAddress, baseAddressPendingCoords);
  const openedLabel = formatJobOpenedAt(job.createdAt, t);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [swipeOverlay, setSwipeOverlay] = useState<'none' | 'accept' | 'pass'>('none');
  const [passExiting, setPassExiting] = useState(false);
  const swipeStartX = useRef(0);
  const swipeStartTarget = useRef<EventTarget | null>(null);
  const title = translateJobTitle(job.title, job.category, job.subcategory, t);
  const CategoryIcon = getCategoryIconById(job.category);
  const categoryTheme = getCategoryFeedTheme(job.category);
  const clientLoc = clientLocationDisplay(job, loc);
  const showCategoryLine = !title.startsWith(`${category}:`);
  const budgetAmount = formatJobBudgetAmount(job, t);
  const budgetNotInformed = budgetAmount === t('jobs.budget_not_informed');
  const dateLabel = openedLabel || schedule;
  const isInterestFull = isJobInterestFull(applicationsCount);
  const canApply =
    !hasApplied && !isApplying && !isInterestFull && !swipeRateLimited && !interactionLocked;

  const acceptOpacity = Math.min(0.42, Math.max(0, dragX / 140));
  const passOpacity = Math.min(0.42, Math.max(0, -dragX / 140));
  const dragRotation = Math.max(-6, Math.min(6, dragX * 0.04));

  const resetSwipeVisual = () => {
    setDragX(0);
    setSwipeOverlay('none');
    setDragging(false);
  };

  const wasProposalOpen = useRef(false);
  useEffect(() => {
    if (wasProposalOpen.current && !proposalOpen) {
      resetSwipeVisual();
    }
    wasProposalOpen.current = proposalOpen;
  }, [proposalOpen]);

  const finishSwipe = (offset: number) => {
    setDragging(false);
    if (hasApplied || interactionLocked) {
      resetSwipeVisual();
      return;
    }
    if (offset > SWIPE_COMMIT_PX) {
      hapticLight();
      resetSwipeVisual();
      if (!isInterestFull) onSwipeInterest?.(job);
      return;
    }
    if (offset < -SWIPE_COMMIT_PX) {
      hapticLight();
      setPassExiting(true);
      setSwipeOverlay('pass');
      setDragX(-Math.min(typeof window !== 'undefined' ? window.innerWidth * 0.45 : 280, 280));
      window.setTimeout(() => {
        onDismiss?.(job.id);
        setPassExiting(false);
        resetSwipeVisual();
      }, 520);
      return;
    }
    resetSwipeVisual();
  };

  const onSwipeStart = (clientX: number, target?: EventTarget | null) => {
    if (hasApplied || isExiting || interactionLocked || proposalOpen || swipeRateLimited) return;
    setDragging(true);
    swipeStartX.current = clientX;
    swipeStartTarget.current = target ?? null;
    setSwipeOverlay('none');
  };

  const onSwipeMove = (clientX: number) => {
    if (hasApplied || isExiting || interactionLocked || proposalOpen || swipeRateLimited) return;
    const dx = clientX - swipeStartX.current;
    setDragX(dx);
    if (dx > 36) setSwipeOverlay('accept');
    else if (dx < -36) setSwipeOverlay('pass');
    else setSwipeOverlay('none');
  };

  const ctaBase =
    'inline-flex min-h-[44px] min-w-0 max-w-full items-center justify-center gap-2 rounded-[14px] px-3 py-2.5 text-[12px] font-semibold leading-tight transition-all duration-200 sm:min-h-0 sm:px-4 sm:text-[13px] md:text-[14px]';


  const interestRingLabel = t('helper_dashboard.interested_ring_label');

  const renderApplyControl = () => {
    const primaryBtn = clsx(
      ctaBase,
      'border-2 border-[#2563EB] bg-white text-[#2563EB] shadow-none',
      'hover:bg-[#EFF6FF] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-55',
    );

    if (hasApplied) {
      return (
        <span
          className={clsx(
            ctaBase,
            'cursor-default gap-2 bg-emerald-50 text-emerald-700 shadow-none',
          )}
        >
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span className="max-[380px]:hidden">{t('helper_dashboard.applied_sent')}</span>
        </span>
      );
    }

    if (isApplying) {
      return (
        <button type="button" disabled className={primaryBtn}>
          <Icons.Loader2 className="h-5 w-5 animate-spin" />
        </button>
      );
    }

    if (isInterestFull) {
      return (
        <span
          className={clsx(
            ctaBase,
            'max-w-[10rem] cursor-default bg-slate-100 px-4 text-center text-[13px] font-semibold leading-tight text-slate-600 shadow-none',
          )}
        >
          {t('helper_dashboard.interested_limit_reached')}
        </span>
      );
    }

    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          hapticSuccess();
          onApply(job);
        }}
        onTouchEnd={(e) => e.stopPropagation()}
        disabled={!canApply}
        className={primaryBtn}
      >
        <Icons.Send className="h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden />
        <span className="text-center">{t('helper_dashboard.apply_now')}</span>
      </button>
    );
  };

  const feedBody = (
    <div className="grid w-full min-w-0 grid-cols-[52px_minmax(0,1fr)_80px] grid-rows-[auto_auto_auto] gap-x-2 gap-y-1.5 sm:grid-cols-[64px_minmax(0,1fr)_80px] sm:gap-x-3 sm:gap-y-2">
      {/* Ícone — ocupa as duas primeiras linhas */}
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

      {/* Título — uma linha, nunca quebra */}
      <div className="col-start-2 row-start-1 min-w-0 overflow-hidden pr-1">
        <span className="block truncate whitespace-nowrap text-[16px] font-bold leading-snug text-[#0F172A] sm:text-[18px]">
          {title}
        </span>
      </div>

      {/* Meta (categoria, orçamento, data) — cada linha nunca quebra */}
      <div className="col-start-2 row-start-2 min-w-0 self-start space-y-1 overflow-hidden">
        {showCategoryLine ? (
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="h-[7px] w-[7px] shrink-0 rounded-full"
              style={{ backgroundColor: categoryTheme.dotColor }}
            />
            <span className="truncate whitespace-nowrap text-[13px] font-medium text-[#64748B]">
              {category}
            </span>
          </div>
        ) : null}

        <div
          className="flex min-w-0 items-center gap-1.5 overflow-hidden"
          style={{ color: categoryTheme.budgetColor }}
        >
          <Icons.Link2 className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
          <span className="truncate whitespace-nowrap text-[13px] font-bold">
            {budgetNotInformed ? budgetAmount : t('jobs.budget_with_amount', { amount: budgetAmount })}
          </span>
        </div>

        {dateLabel ? (
          <div className="flex min-w-0 items-center gap-1.5 overflow-hidden text-[#94A3B8]">
            <Icons.Calendar className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
            <span className="truncate whitespace-nowrap text-[12px] font-medium">
              {dateLabel}
            </span>
          </div>
        ) : null}
      </div>

      {/* Anel de interessados — ocupa as duas primeiras linhas, nunca quebra */}
      <div className="col-start-3 row-start-1 row-span-2 flex shrink-0 items-center justify-center self-center">
        <InterestedRing
          interestedCount={applicationsCount}
          label={interestRingLabel}
          size={80}
        />
      </div>

      {/* Rodapé — avatar + nome do cliente + botão */}
      <div className="col-span-3 col-start-1 row-start-3 mt-0.5 flex flex-col gap-2 border-t border-slate-100/80 pt-2.5 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onViewClientProfile?.(job);
          }}
          className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden text-left"
          aria-label={t('helper_public.view_profile')}
        >
          {job.clientAvatar && !job.clientAvatar.includes('pravatar') ? (
            <img
              src={job.clientAvatar}
              alt=""
              className="h-8 w-8 shrink-0 rounded-full object-cover ring-2 ring-white shadow-sm"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-2 ring-white shadow-sm"
              style={{
                backgroundColor: categoryTheme.iconBg,
                color: categoryTheme.iconColor,
              }}
            >
              {clientInitials(job.clientName)}
            </div>
          )}
          <div className="min-w-0 overflow-hidden">
            <p className="truncate whitespace-nowrap text-[14px] font-bold leading-tight text-[#0F172A]">
              {job.clientName}
            </p>
            <p className="mt-0.5 truncate whitespace-nowrap text-[12px] font-medium text-[#94A3B8]">
              {clientLoc}
            </p>
          </div>
        </button>
        <div className="w-full shrink-0 sm:w-auto [&_button]:w-full sm:[&_button]:w-auto [&_span]:w-full sm:[&_span]:w-auto">
          {renderApplyControl()}
        </div>
      </div>

      <div className="sr-only">
        <HelperCreditCostBlock job={job} t={t} distanceKm={distanceKm} variant="compact" showHireEstimate />
        {schedule} {loc} {openedLabel} {title} {applicationsCount} {clientReviewCount}
      </div>
    </div>
  );


  const cardShell = clsx(
    'group/card relative h-full w-full max-w-full overflow-hidden rounded-[22px] border bg-white transition-all duration-200',
    'shadow-[0_4px_24px_rgba(15,23,42,0.07)]',
    'md:hover:-translate-y-0.5 md:hover:shadow-[0_10px_36px_rgba(15,23,42,0.09)] motion-reduce:transform-none',
    (isExiting || passExiting) &&
      'pointer-events-none scale-[0.88] opacity-0 -translate-x-8 -rotate-2 duration-[520ms] ease-[cubic-bezier(0.34,1.15,0.64,1)]',
    swipeRateLimited && !isExiting && 'opacity-75',
    tier === 'urgent' ? 'border-rose-200/80' : tier === 'best' ? 'border-emerald-200/70' : 'border-slate-200/70',
  );

  const cardPadding = 'relative z-20 bg-white px-3 pb-3 pt-3 sm:px-4 sm:pb-4 sm:pt-4 will-change-transform';

  const topAccent = (
    <div
      className="h-[3px] w-full shrink-0 rounded-t-[22px]"
      style={{
        background: `linear-gradient(90deg, ${categoryTheme.iconColor}90 0%, ${categoryTheme.iconColor}20 100%)`,
      }}
      aria-hidden
    />
  );

  return (
    <LhCard padding="none" className={cardShell}>
      {topAccent}
      {/* Mobile — swipe */}
      <div
        className="relative w-full max-w-full overflow-hidden touch-pan-y md:hidden"
        onTouchStart={(e) => onSwipeStart(e.touches[0]?.clientX ?? 0, e.target)}
        onTouchMove={(e) => onSwipeMove(e.touches[0]?.clientX ?? 0)}
        onTouchEnd={(e) => finishSwipe((e.changedTouches[0]?.clientX ?? 0) - swipeStartX.current)}
      >
        <div
          className="pointer-events-none absolute inset-y-0 left-2 z-0 flex items-center"
          aria-hidden
        >
          <span className="flex max-w-[5.5rem] flex-col items-center gap-0.5 rounded-xl border border-rose-200/60 bg-rose-50/45 px-2 py-1.5 text-center opacity-40">
            <span className="text-base leading-none">←</span>
            <span className="text-[9px] font-black uppercase leading-tight text-rose-800">
              {t('helper_dashboard.swipe_not_interested')}
            </span>
          </span>
        </div>
        <div
          className="pointer-events-none absolute inset-y-0 right-2 z-0 flex items-center"
          aria-hidden
        >
          <span className="flex max-w-[5.5rem] flex-col items-center gap-0.5 rounded-xl border border-emerald-200/60 bg-emerald-50/45 px-2 py-1.5 text-center opacity-40">
            <span className="text-base leading-none">→</span>
            <span className="text-[9px] font-black uppercase leading-tight text-emerald-800">
              {t('helper_dashboard.swipe_interest')}
            </span>
          </span>
        </div>

        <div
          className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-emerald-500/30 text-emerald-950 backdrop-blur-[2px] transition-opacity duration-100"
          style={{ opacity: acceptOpacity }}
        >
          <Icons.Check className="h-10 w-10" strokeWidth={2.5} />
          <span className="text-sm font-black">{t('helper_dashboard.swipe_interest')}</span>
        </div>
        <div
          className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-rose-500/30 text-rose-950 backdrop-blur-[2px] transition-opacity duration-100"
          style={{ opacity: passOpacity }}
        >
          <Icons.X className="h-10 w-10" strokeWidth={2.5} />
          <span className="text-sm font-black">{t('helper_dashboard.swipe_not_interested')}</span>
        </div>

        <div
          className={clsx(
            cardPadding,
            !dragging && 'transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.34,1.2,0.64,1)]',
          )}
          style={{
            transform: `translateX(${dragX}px) rotate(${dragRotation}deg)`,
            opacity: 1 - Math.min(0.12, Math.abs(dragX) / 400),
          }}
        >
          {feedBody}
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden px-4 pb-4 pt-4 md:block">
        {feedBody}
      </div>
    </LhCard>
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
    prev.swipeRateLimited === next.swipeRateLimited &&
    prev.activeTab === next.activeTab &&
    prev.distanceKm === next.distanceKm &&
    prev.distanceFromBase === next.distanceFromBase &&
    prev.needsBaseAddress === next.needsBaseAddress &&
    prev.applicationsCount === next.applicationsCount &&
    prev.clientReviewCount === next.clientReviewCount
  );
});
