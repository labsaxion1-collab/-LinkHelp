import { memo } from 'react';
import * as Icons from 'lucide-react';
import { Check, CheckCircle2, Clock, MapPin } from 'lucide-react';
import type { Job } from '@/types/job';
import { formatJobBudgetDisplay } from '@/utils/formatJobBudget';
import { isBeautyScheduledJob } from '@/utils/jobDisplay';
import { LhCard } from '@/components/design-system/LhCard';
import { clsx } from 'clsx';

export type HelperOpportunityCardTab = 'match' | 'recentes' | 'emergencia';

type TFn = (key: string, options?: Record<string, string | number>) => string;
type TranslateFn = (raw: string, t: (key: string) => string) => string;

export type HelperOpportunityCardProps = {
  job: Job;
  activeTab: HelperOpportunityCardTab;
  hasApplied: boolean;
  isApplying: boolean;
  onApply: (jobId: string) => void;
  onViewClientProfile?: (job: Job) => void;
  onViewDetails?: (job: Job) => void;
  applicationsCount?: number;
  t: TFn;
  translateCategory: TranslateFn;
  formatJobSchedule: (job: Job, t: TFn) => string;
  distanceKm?: number | null;
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

function estimateLeadCost(job: Job, distanceKm?: number | null): number {
  let cost = job.urgency === 'high' ? 4 : 2;
  if (job.description.length > 180) cost += 1;
  if (distanceKm != null && distanceKm <= 8) cost += 1;
  return Math.min(cost, 6);
}

function estimateLeadQuality(job: Job, distanceKm?: number | null): number {
  let score = 58;
  if (job.description.length > 120) score += 14;
  if (job.location.trim()) score += 10;
  if (job.value && !/negotiable|combinar|agree/i.test(job.value)) score += 8;
  if (job.urgency === 'high') score += 6;
  if (distanceKm != null && distanceKm <= 10) score += 4;
  return Math.min(score, 98);
}

function locationLabel(job: Job, distanceKm: number | null | undefined, t: TFn): string {
  if (distanceKm != null) return t('helper_dashboard.distance_km', { km: distanceKm.toFixed(1) });
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
  onViewClientProfile,
  onViewDetails,
  t,
  translateCategory,
  formatJobSchedule,
  distanceKm,
  applicationsCount = 0,
}: HelperOpportunityCardProps) {
  const tier = jobMatchTier(job, activeTab);
  const leadCost = estimateLeadCost(job, distanceKm);
  const qualityScore = estimateLeadQuality(job, distanceKm);
  const helperLimit = tier === 'urgent' ? 5 : 3;
  const schedule = formatJobSchedule(job, t);
  const category = translateCategory(job.category, t);
  const loc = locationLabel(job, distanceKm, t);
  const budget = valueLabel(job, t);

  const ctaBase =
    'inline-flex min-h-[40px] flex-1 min-w-0 items-center justify-center gap-1.5 rounded-xl px-2.5 text-sm font-bold transition-all duration-200';

  const cardShell = clsx(
    'group/card h-full w-full max-w-full overflow-hidden border bg-white/95 transition-all duration-300',
    'md:hover:-translate-y-0.5 md:hover:shadow-xl md:hover:shadow-slate-900/10 motion-reduce:transform-none',
    'md:hover:ring-2 md:hover:ring-blue-500/15',
    tier === 'urgent' &&
      'border-rose-200/90 ring-1 ring-rose-200/50 shadow-md shadow-rose-500/10 motion-reduce:animate-none md:animate-pulse',
    tier === 'best' && 'border-emerald-200/80 ring-1 ring-emerald-100/60 shadow-sm shadow-emerald-500/10',
    tier === 'normal' && 'border-slate-200/80',
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

      {/* Mobile compact — scan-first: horário, valor, distância, urgência */}
      <div className="w-full max-w-full p-2.5 md:hidden">
        <div className="mb-2 flex items-center justify-between gap-2">
          {tier === 'urgent' ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-rose-600 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-white shadow-sm shadow-rose-600/30">
              <Icons.AlertTriangle className="h-3 w-3" />
              {t('helper_dashboard.job_card_urgent')}
            </span>
          ) : tier === 'best' ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-500/15 px-2 py-1 text-[10px] font-black text-emerald-100">
              <Icons.Sparkles className="h-3 w-3 text-emerald-300" />
              {t('helper_dashboard.compatibility', { pct: 95 })}
            </span>
          ) : (
            <span className="truncate text-[10px] font-bold uppercase tracking-wide text-slate-400">{category}</span>
          )}
          <span className="inline-flex min-w-0 max-w-[58%] items-center gap-1 text-sm font-black tabular-nums text-slate-100">
            <Clock className="h-3.5 w-3.5 shrink-0 text-[#33B6FF]" />
            <span className="truncate">{schedule}</span>
          </span>
        </div>

        <div className="mb-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-lg font-black leading-none text-[#33B6FF]">{budget}</span>
          <span className="inline-flex items-center gap-1 text-sm font-bold text-[#F2F4F7]">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-[#1565FF]" />
            <span className="truncate">{loc}</span>
          </span>
        </div>

        <p className="mb-0.5 line-clamp-1 text-xs font-semibold text-slate-300">{job.title}</p>
        <p className="mb-2 truncate text-[10px] font-medium text-slate-500">{job.clientName}</p>

        <div className="flex gap-2">
          {onViewDetails ? (
            <button
              type="button"
              onClick={() => onViewDetails(job)}
              className={`${ctaBase} border border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50`}
            >
              <Icons.FileText className="h-4 w-4 shrink-0" />
              <span className="truncate">{t('notifications.view_details')}</span>
            </button>
          ) : null}
          {hasApplied ? (
            <button
              type="button"
              disabled
              className={`${ctaBase} cursor-not-allowed border border-emerald-200/80 bg-emerald-100 text-emerald-800`}
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span className="truncate">{t('helper_dashboard.applied_sent')}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onApply(job.id)}
              disabled={isApplying}
              className={`${ctaBase} border border-blue-600/90 bg-blue-600 text-white hover:bg-blue-700 disabled:pointer-events-none disabled:opacity-70`}
            >
              {isApplying ? (
                <>
                  <Icons.Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                  <span className="truncate">{t('helper_dashboard.apply_sending')}</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 shrink-0" />
                  <span className="truncate">{t('helper_dashboard.apply_now')}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Desktop full */}
      <div className="hidden w-full max-w-full md:block">
        <div className="p-4">
          <div className="mb-3 flex items-center gap-3">
            <img
              src={job.clientAvatar}
              alt=""
            className="h-10 w-10 rounded-full border border-slate-100 object-cover shadow-sm"
            loading="lazy"
            decoding="async"
          />
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => onViewClientProfile?.(job)}
                className="block max-w-full truncate text-left font-bold leading-tight text-slate-900 transition-colors hover:text-blue-700"
              >
                {job.clientName}
              </button>
              <p className="flex items-center gap-1 truncate text-xs font-medium text-slate-500">
                {category}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onViewDetails?.(job)}
            className="mb-2 line-clamp-2 text-left text-base font-bold leading-snug text-slate-900 hover:text-blue-700"
          >
            {job.title}
          </button>
          <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-slate-600">{job.description}</p>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-[var(--lh-radius-sm)] border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-800">
              <Icons.BadgeCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" />{' '}
              {t('helper_dashboard.lead_quality', { pct: qualityScore })}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-[var(--lh-radius-sm)] border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-800">
              <Icons.Coins className="h-3.5 w-3.5 shrink-0 text-blue-600" /> {t('helper_dashboard.lead_cost', { count: leadCost })}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-[var(--lh-radius-sm)] border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-900">
              <Icons.Users className="h-3.5 w-3.5 shrink-0 text-amber-600" />{' '}
              {t('helper_dashboard.lead_competition', { count: helperLimit })}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-[var(--lh-radius-sm)] border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-bold text-blue-800">
              <Icons.UserCheck className="h-3.5 w-3.5 shrink-0 text-blue-600" />{' '}
              {t('helper_dashboard.applications_count', { count: applicationsCount })}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-[var(--lh-radius-sm)] border border-slate-200/90 bg-slate-50/80 px-2.5 py-1.5 text-xs font-medium text-slate-700">
              <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" /> {schedule}
            </span>
            {isBeautyScheduledJob(job) ? (
              <span className="inline-flex items-center gap-1 rounded-[var(--lh-radius-sm)] border border-violet-100 bg-violet-50 px-2.5 py-1.5 text-xs font-bold text-violet-800">
                <span aria-hidden>🕒</span>
                {job.preferredTime}
                <span className="font-semibold text-violet-600/90">· {t('jobs.scheduled_time_badge')}</span>
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1.5 rounded-[var(--lh-radius-sm)] border border-slate-200/90 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" /> {loc}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-[var(--lh-radius-sm)] border border-slate-200/90 bg-slate-50/90 px-2.5 py-1.5 text-xs font-semibold text-slate-700">
              <Icons.Handshake className="h-3.5 w-3.5 shrink-0 text-slate-500" /> {budget}
            </span>
          </div>
        </div>
        <div className="mx-4 mb-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2.5">
          <p className="line-clamp-2 text-xs font-semibold leading-relaxed text-slate-600">
            {t('helper_dashboard.lead_unlock_note')}
          </p>
        </div>
        <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3">
          {onViewDetails ? (
            <button
              type="button"
              onClick={() => onViewDetails(job)}
              className="inline-flex min-h-[38px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
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
              onClick={() => onApply(job.id)}
              disabled={isApplying}
              className={`${ctaBase} w-full border border-blue-600/90 bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md hover:shadow-blue-600/15 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-70`}
            >
              {isApplying ? (
                <>
                  <Icons.Loader2 className="h-4 w-4 shrink-0 animate-spin" /> {t('helper_dashboard.apply_sending')}
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 shrink-0" /> {t('helper_dashboard.apply_now')}
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
    prev.hasApplied === next.hasApplied &&
    prev.isApplying === next.isApplying &&
    prev.activeTab === next.activeTab &&
    prev.distanceKm === next.distanceKm &&
    prev.applicationsCount === next.applicationsCount
  );
});
