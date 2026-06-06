import { memo, useEffect, useRef, useState, type MouseEvent } from 'react';
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
    const isTap = Math.abs(offset) < 8;
    resetSwipeVisual();
    if (isTap && onViewDetails && !isNestedInteractiveTarget(swipeStartTarget.current)) {
      onViewDetails(job);
    }
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
    'inline-flex min-w-0 max-w-full items-center justify-center gap-2 rounded-[14px] px-4 py-2.5 text-[13px] font-semibold leading-tight transition-all duration-200 sm:text-[14px]';

  const isNestedInteractiveTarget = (target: EventTarget | null, container?: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    const interactive = target.closest('button, a');
    if (!interactive) return false;
    if (container instanceof HTMLElement && interactive === container) return false;
    return true;
  };

  const openDetails = () => onViewDetails?.(job);

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
    <div className="grid w-full grid-cols-[76px_1fr_88px] grid-rows-[auto_auto_auto] gap-x-4 gap-y-3">
      {/* Ícone — ocupa as duas primeiras linhas */}
      <div
        className="col-start-1 row-start-1 row-span-2 flex h-[76px] w-[76px] items-center justify-center self-start rounded-[20px] border shadow-[0_8px_22px_rgba(15,23,42,0.06)]"
        style={{
          backgroundColor: categoryTheme.iconBg,
          borderColor: `${categoryTheme.iconColor}22`,
          boxShadow: `0 8px 22px ${categoryTheme.iconColor}14`,
        }}
      >
        <CategoryIcon
          className="h-8 w-8"
          style={{ color: categoryTheme.iconColor }}
          strokeWidth={2}
          aria-hidden
        />
      </div>

      {/* Título */}
      <div className="col-start-2 row-start-1 min-w-0 pr-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openDetails();
          }}
          onTouchEnd={(e) => e.stopPropagation()}
          className="block w-full text-left"
        >
          <span className="text-[20px] font-bold leading-[1.2] text-[#0F172A] [overflow-wrap:normal] [word-break:normal]">
            {title}
          </span>
        </button>
      </div>

      {/* Badge — canto superior direito */}
      <div className="col-start-3 row-start-1 flex justify-end self-start">
        <span
          className={clsx(
            'rounded-full px-3 py-1 text-[12px] font-semibold',
            job.urgency === 'high' ? 'bg-rose-50 text-rose-600' : 'bg-[#EEF2FF] text-[#2563EB]',
          )}
        >
          {job.urgency === 'high' ? t('helper_dashboard.job_card_urgent') : 'Novo'}
        </span>
      </div>

      {/* Meta (categoria, orçamento, data) */}
      <div className="col-start-2 row-start-2 min-w-0 self-center">
        {showCategoryLine ? (
          <div className="mb-2 flex items-center gap-2 text-[15px] font-medium text-[#64748B]">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: categoryTheme.dotColor }}
            />
            <span className="min-w-0 [overflow-wrap:normal] [word-break:normal]">{category}</span>
          </div>
        ) : null}

        <div className="mb-2 flex min-w-0 items-center gap-2 text-[15px] font-bold" style={{ color: categoryTheme.budgetColor }}>
          <Icons.Link2 className="h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden />
          <span className="min-w-0 [overflow-wrap:normal] [word-break:normal]">
            {budgetNotInformed ? budgetAmount : t('jobs.budget_with_amount', { amount: budgetAmount })}
          </span>
        </div>

        {dateLabel ? (
          <div className="flex min-w-0 items-center gap-2 text-[15px] font-medium text-[#64748B]">
            <Icons.Calendar className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
            <span className="min-w-0 [overflow-wrap:normal] [word-break:normal]">{dateLabel}</span>
          </div>
        ) : null}
      </div>

      {/* Anel — alinhado às linhas de meta */}
      <div className="col-start-3 row-start-2 flex items-center justify-center self-center">
        <InterestedRing interestedCount={applicationsCount} label={interestRingLabel} size={84} />
      </div>

      {/* Rodapé — avatar + nome + botão com espaço adequado */}
      <div className="col-span-3 col-start-1 row-start-3 mt-1 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onViewClientProfile?.(job);
          }}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-label={t('helper_public.view_profile')}
        >
          {job.clientAvatar && !job.clientAvatar.includes('pravatar') ? (
            <img
              src={job.clientAvatar}
              alt=""
              className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-white shadow-sm"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600 ring-2 ring-white shadow-sm">
              {clientInitials(job.clientName)}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold leading-tight text-[#0F172A]">
              {job.clientName}
            </p>
            <p className="mt-0.5 truncate text-[13px] font-medium text-[#64748B]">{clientLoc}</p>
          </div>
        </button>
        <div className="shrink-0">{renderApplyControl()}</div>
      </div>

      <div className="sr-only">
        <HelperCreditCostBlock job={job} t={t} distanceKm={distanceKm} variant="compact" showHireEstimate />
        {schedule} {loc} {openedLabel} {title} {applicationsCount} {clientReviewCount}
      </div>
    </div>
  );

  const handleCardSurfaceClick = (e: MouseEvent<HTMLElement>) => {
    if (!onViewDetails || isNestedInteractiveTarget(e.target, e.currentTarget)) return;
    if (Math.abs(dragX) > 8) return;
    openDetails();
  };

  const cardShell = clsx(
    'group/card h-full w-full max-w-full overflow-hidden rounded-[24px] border border-slate-200/60 bg-white transition-all duration-200',
    'shadow-[0_8px_32px_rgba(15,23,42,0.06)]',
    'md:hover:-translate-y-0.5 md:hover:shadow-[0_14px_48px_rgba(15,23,42,0.07)] motion-reduce:transform-none',
    (isExiting || passExiting) &&
      'pointer-events-none scale-[0.88] opacity-0 -translate-x-8 -rotate-2 duration-[520ms] ease-[cubic-bezier(0.34,1.15,0.64,1)]',
    swipeRateLimited && !isExiting && 'opacity-75',
    tier === 'urgent' && 'border-rose-200/80 ring-1 ring-rose-100/60',
    tier === 'best' && 'border-emerald-200/70 ring-1 ring-emerald-100/50',
  );

  const cardPadding = 'relative z-20 bg-white p-5 will-change-transform';

  return (
    <LhCard padding="none" className={cardShell}>
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
            onViewDetails && 'cursor-pointer',
          )}
          style={{
            transform: `translateX(${dragX}px) rotate(${dragRotation}deg)`,
            opacity: 1 - Math.min(0.12, Math.abs(dragX) / 400),
          }}
          onClick={handleCardSurfaceClick}
          onKeyDown={(e) => {
            if (!onViewDetails || isNestedInteractiveTarget(e.target, e.currentTarget)) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openDetails();
            }
          }}
        >
          {feedBody}
        </div>
      </div>

      {/* Desktop */}
      <div
        className={clsx('hidden p-5 md:block', onViewDetails && 'cursor-pointer')}
        onClick={handleCardSurfaceClick}
        onKeyDown={(e) => {
          if (!onViewDetails || isNestedInteractiveTarget(e.target, e.currentTarget)) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openDetails();
          }
        }}
      >
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
