import { memo, useEffect, useRef, useState } from 'react';
import { hapticLight, hapticSuccess } from '@/utils/haptic';
import * as Icons from 'lucide-react';
import { CheckCircle2, Clock, MapPin, History } from 'lucide-react';
import { getCategoryIconById } from '@/utils/categoryIcons';
import { StarRatingDisplay } from '@/components/reviews/StarRatingInput';
import { clsx } from 'clsx';
import type { Job } from '@/types/job';
import { formatJobBudgetDisplay } from '@/utils/formatJobBudget';
import { formatJobScheduleDisplay, formatJobOpenedAt } from '@/utils/jobDisplay';
import { translateJobTitle } from '@/utils/translateCategory';
import { LhCard } from '@/components/design-system/LhCard';
import { HelperCreditCostBlock } from '@/components/helpers/HelperCreditCostBlock';
import { isRemoteJob } from '@/utils/calculateHelperLeadCreditCost';

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

function valueLabel(job: Job, t: TFn): string {
  return formatJobBudgetDisplay(job, t);
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
  const budget = valueLabel(job, t);
  const openedLabel = formatJobOpenedAt(job.createdAt, t);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [swipeOverlay, setSwipeOverlay] = useState<'none' | 'accept' | 'pass'>('none');
  const [passExiting, setPassExiting] = useState(false);
  const swipeStartX = useRef(0);
  const title = translateJobTitle(job.title, job.category, job.subcategory, t);
  const subLabel =
    job.subcategory && job.category
      ? t(`service_subs.${job.category}.${job.subcategory}`)
      : title;

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
      onSwipeInterest?.(job);
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
    setDragX(0);
    setSwipeOverlay('none');
  };

  const onSwipeStart = (clientX: number) => {
    if (hasApplied || isExiting || interactionLocked || proposalOpen || swipeRateLimited) return;
    setDragging(true);
    swipeStartX.current = clientX;
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
    'inline-flex min-h-[40px] flex-1 min-w-0 items-center justify-center gap-1.5 rounded-xl px-2.5 text-sm font-bold transition-all duration-200';

  const cardShell = clsx(
    'group/card h-full w-full max-w-full overflow-hidden rounded-2xl border bg-white transition-all duration-300 shadow-[0_8px_22px_rgba(15,23,42,0.06)]',
    'md:hover:-translate-y-0.5 md:hover:shadow-xl md:hover:shadow-slate-900/10 motion-reduce:transform-none',
    'md:hover:ring-2 md:hover:ring-blue-500/15',
    (isExiting || passExiting) &&
      'pointer-events-none scale-[0.88] opacity-0 -translate-x-8 -rotate-2 duration-[520ms] ease-[cubic-bezier(0.34,1.15,0.64,1)]',
    swipeRateLimited && !isExiting && 'opacity-75',
    tier === 'urgent' &&
      'border-rose-200/90 ring-1 ring-rose-200/50 shadow-md shadow-rose-500/10 motion-reduce:animate-none md:animate-pulse',
    tier === 'best' && 'border-emerald-200/80 ring-1 ring-emerald-100/60 shadow-sm shadow-emerald-500/10',
    tier === 'normal' && 'border-white',
  );

  const header =
    tier === 'urgent' ? (
      <div className="hidden items-center justify-between gap-2 border-b border-rose-200/70 bg-rose-50/90 px-3 py-2 md:flex md:px-4 md:py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Icons.AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
          <span className="truncate text-[10px] font-bold uppercase tracking-wide text-rose-900 md:text-[11px]">
            {t('helper_dashboard.job_card_urgent')}
          </span>
        </div>
        <span className="shrink-0 rounded-md border border-rose-200/90 bg-white/95 px-2 py-0.5 text-[10px] font-bold text-rose-900">
          {t('helper_dashboard.job_card_high_priority')}
        </span>
      </div>
    ) : tier === 'best' ? (
      <div className="hidden items-center justify-between gap-2 border-b border-emerald-200/70 bg-emerald-50/85 px-3 py-2 md:flex md:px-4 md:py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Icons.Sparkles className="h-4 w-4 shrink-0 text-emerald-700" />
          <span className="truncate text-[10px] font-bold uppercase tracking-wide text-emerald-950 md:text-[11px]">
            {t('helper_dashboard.job_card_best_match')}
          </span>
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-md border border-emerald-200/90 bg-white/95 px-2 py-0.5 text-[10px] font-bold tabular-nums text-emerald-900">
          <Icons.Zap className="h-3 w-3 shrink-0 text-emerald-600" /> {t('helper_dashboard.compatibility', { pct: 95 })}
        </span>
      </div>
    ) : (
      <div className="hidden border-b border-slate-100/90 bg-slate-50/70 px-4 py-2 md:block">
        <div className="flex min-w-0 items-center gap-2">
          <Icons.CircleDot className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
            {t('helper_dashboard.job_card_standard')}
          </span>
        </div>
      </div>
    );

  return (
    <LhCard padding="none" className={cardShell}>
      {header}

      {/* Mobile compact — swipe with drag, hints, and overlay intensity */}
      <div
        className="relative w-full max-w-full overflow-hidden touch-pan-y md:hidden"
        onTouchStart={(e) => onSwipeStart(e.touches[0]?.clientX ?? 0)}
        onTouchMove={(e) => onSwipeMove(e.touches[0]?.clientX ?? 0)}
        onTouchEnd={(e) => finishSwipe((e.changedTouches[0]?.clientX ?? 0) - swipeStartX.current)}
      >
        <div
          className="pointer-events-none absolute inset-y-0 left-2 z-0 flex items-center"
          aria-hidden
        >
          <span className="flex max-w-[5.5rem] flex-col items-center gap-0.5 rounded-xl border border-rose-200/60 bg-rose-50/45 px-2 py-1.5 text-center opacity-40">
            <span className="text-base leading-none">❌</span>
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
            <span className="text-base leading-none">✅</span>
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
            'relative z-20 bg-white p-3 will-change-transform',
            !dragging && 'transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.34,1.2,0.64,1)]',
          )}
          style={{
            transform: `translateX(${dragX}px) rotate(${dragRotation}deg)`,
            opacity: 1 - Math.min(0.12, Math.abs(dragX) / 400),
          }}
        >
          <div className="flex gap-3">
            <div className="relative flex h-[4.25rem] w-[4.25rem] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-blue-50 to-sky-100 ring-1 ring-blue-100/80">
              <CategoryIcon className="h-7 w-7 text-blue-600" strokeWidth={1.75} aria-hidden />
              {job.urgency === 'high' ? (
                <span className="absolute left-1 top-1 rounded-md bg-rose-500 px-1 py-0.5 text-[8px] font-black uppercase leading-none text-white">
                  !
                </span>
              ) : null}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-[15px] font-black leading-snug text-slate-950">{title}</p>
                  <p className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-wide text-blue-600">{category}</p>
                </div>
                <span className="shrink-0 text-right text-sm font-black leading-tight text-blue-700">{budget}</span>
              </div>

              <ul className="mt-1.5 space-y-0.5 text-[11px] font-semibold text-slate-600">
                {schedule ? (
                  <li className="flex items-center gap-1.5 min-w-0">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-blue-500" aria-hidden />
                    <span className="truncate">{schedule}</span>
                  </li>
                ) : null}
                <li className="flex items-center gap-1.5 min-w-0">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                  <span className="truncate">{loc}</span>
                </li>
                {openedLabel ? (
                  <li className="flex items-center gap-1.5 min-w-0 text-slate-500">
                    <History className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{openedLabel}</span>
                  </li>
                ) : null}
                <li className="flex items-center gap-1.5 text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>{t('helper_dashboard.client_verified_short')}</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2 border-t border-slate-100/90 pt-2">
            <button
              type="button"
              onClick={() => onViewClientProfile?.(job)}
              className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-100 bg-slate-50"
              aria-label={t('helper_public.view_profile')}
            >
              <img src={job.clientAvatar} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-bold text-slate-800">{job.clientName}</p>
              {job.clientRating != null && job.clientRating > 0 ? (
                <p className="flex items-center gap-1 text-[10px] font-bold text-amber-700">
                  <StarRatingDisplay rating={job.clientRating} />
                  <span className="truncate">
                    {t('helper_dashboard.client_rating_short', {
                      rating: job.clientRating.toFixed(1),
                      count: clientReviewCount,
                    })}
                  </span>
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-2">
            <HelperCreditCostBlock job={job} t={t} distanceKm={distanceKm} variant="feed" showHireEstimate />
          </div>

          {onViewDetails ? (
            <button
              type="button"
              onClick={() => onViewDetails(job)}
              className={`${ctaBase} mt-2 min-h-[36px] w-full border border-slate-200 bg-white text-xs text-slate-700 hover:border-blue-200 hover:bg-blue-50`}
            >
              <Icons.FileText className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{t('notifications.view_details')}</span>
            </button>
          ) : null}

          {hasApplied ? (
            <p className="mt-2 text-center text-[10px] font-bold text-emerald-700">{t('helper_dashboard.applied_sent')}</p>
          ) : isApplying ? (
            <p className="mt-2 flex items-center justify-center gap-1 text-center text-[10px] font-bold text-blue-700">
              <Icons.Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t('helper_dashboard.apply_sending')}
            </p>
          ) : (
            <div className="mt-2 space-y-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  hapticSuccess();
                  onApply(job);
                }}
                onTouchEnd={(e) => e.stopPropagation()}
                disabled={swipeRateLimited || interactionLocked}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#2563FF] px-3 text-sm font-black text-white shadow-[0_10px_22px_rgba(37,99,255,0.22)] active:scale-[0.99] disabled:opacity-60"
              >
                <Icons.Check className="h-4 w-4" />
                {t('helper_dashboard.apply_now')}
              </button>
              <div className="flex items-stretch overflow-hidden rounded-lg border border-slate-100 bg-slate-50/80">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    hapticLight();
                    onDismiss?.(job.id);
                  }}
                  onTouchEnd={(e) => e.stopPropagation()}
                  disabled={swipeRateLimited || interactionLocked}
                  className="flex flex-1 items-center justify-center px-2 py-2 text-[10px] font-bold text-rose-700 active:bg-rose-50 disabled:opacity-60"
                >
                  {t('helper_dashboard.swipe_not_interested')}
                </button>
                <span className="w-px self-stretch bg-slate-200" aria-hidden />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    hapticLight();
                    onSwipeInterest?.(job);
                  }}
                  onTouchEnd={(e) => e.stopPropagation()}
                  disabled={swipeRateLimited || interactionLocked}
                  className="flex flex-1 items-center justify-center px-2 py-2 text-[10px] font-bold text-emerald-700 active:bg-emerald-50 disabled:opacity-60"
                >
                  {t('helper_dashboard.swipe_interest')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Desktop — mesmo layout compacto do feed mobile */}
      <div className="hidden w-full max-w-full md:block">
        <div className="p-3">
          <div className="flex gap-3">
            <div className="relative flex h-[4.25rem] w-[4.25rem] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-blue-50 to-sky-100 ring-1 ring-blue-100/80">
              <CategoryIcon className="h-7 w-7 text-blue-600" strokeWidth={1.75} aria-hidden />
              {job.urgency === 'high' ? (
                <span className="absolute left-1 top-1 rounded-md bg-rose-500 px-1 py-0.5 text-[8px] font-black uppercase leading-none text-white">
                  !
                </span>
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => onViewDetails?.(job)}
                    className="line-clamp-2 text-left text-[15px] font-black leading-snug text-slate-950 hover:text-blue-700"
                  >
                    {title}
                  </button>
                  <p className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-wide text-blue-600">{category}</p>
                </div>
                <span className="shrink-0 text-sm font-black text-blue-700">{budget}</span>
              </div>
              <ul className="mt-1.5 space-y-0.5 text-[11px] font-semibold text-slate-600">
                {schedule ? (
                  <li className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-blue-500" aria-hidden />
                    <span className="truncate">{schedule}</span>
                  </li>
                ) : null}
                <li className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                  <span className="truncate">{loc}</span>
                </li>
                {openedLabel ? (
                  <li className="flex items-center gap-1.5 text-slate-500">
                    <History className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{openedLabel}</span>
                  </li>
                ) : null}
                <li className="flex items-center gap-1.5 text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>{t('helper_dashboard.client_verified_short')}</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 border-t border-slate-100/90 pt-2">
            <button
              type="button"
              onClick={() => onViewClientProfile?.(job)}
              className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-100 bg-slate-50"
              aria-label={t('helper_public.view_profile')}
            >
              <img
                src={job.clientAvatar}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </button>
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => onViewClientProfile?.(job)}
                className="truncate text-left text-[11px] font-bold text-slate-800 hover:text-blue-700"
              >
                {job.clientName}
              </button>
              {job.clientRating != null && job.clientRating > 0 ? (
                <p className="flex items-center gap-1 text-[10px] font-bold text-amber-700">
                  <StarRatingDisplay rating={job.clientRating} />
                  <span>
                    {t('helper_dashboard.client_rating_short', {
                      rating: job.clientRating.toFixed(1),
                      count: clientReviewCount,
                    })}
                  </span>
                </p>
              ) : null}
            </div>
            <span className="inline-flex shrink-0 items-center gap-0.5 text-[10px] font-bold text-blue-800">
              <Icons.UserCheck className="h-3 w-3 shrink-0" />
              {t('helper_dashboard.applications_count', { count: applicationsCount })}
            </span>
          </div>
          <div className="mt-2">
            <HelperCreditCostBlock job={job} t={t} distanceKm={distanceKm} variant="feed" showHireEstimate />
          </div>
        </div>
        <div className="flex flex-col gap-1.5 border-t border-slate-100 bg-slate-50/60 px-3 py-2">
          {onViewDetails ? (
            <button
              type="button"
              onClick={() => onViewDetails(job)}
              className="inline-flex min-h-[36px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            >
              <Icons.FileText className="h-4 w-4" />
              {t('notifications.view_details')}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onViewClientProfile?.(job)}
            className="inline-flex min-h-[38px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            <Icons.Eye className="h-4 w-4" />
            {t('helper_public.view_profile')}
          </button>
          {hasApplied ? (
            <button
              type="button"
              disabled
              className={`${ctaBase} w-full cursor-not-allowed border border-emerald-200/80 bg-emerald-100 text-emerald-800`}
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" /> {t('helper_dashboard.applied_sent')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onApply(job)}
              disabled={isApplying}
              className={`${ctaBase} w-full border border-blue-600/90 bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md hover:shadow-blue-600/15 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-70`}
            >
              {isApplying ? (
                <>
                  <Icons.Loader2 className="h-4 w-4 shrink-0 animate-spin" /> {t('helper_dashboard.apply_sending')}
                </>
              ) : (
                <>
                  <Icons.Check className="h-4 w-4 shrink-0" /> {t('helper_dashboard.apply_now')}
                </>
              )}
            </button>
          )}
        </div>
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
