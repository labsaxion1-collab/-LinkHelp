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

export function HelperOpportunityCard({
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

  const header =
    tier === 'urgent' ? (
      <div className="px-4 py-2.5 flex items-center justify-between border-b border-rose-200/70 bg-rose-50/90">
        <div className="flex items-center gap-2 min-w-0">
          <Icons.AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="text-[11px] font-bold text-rose-900 tracking-wide uppercase">{t('helper_dashboard.job_card_urgent')}</span>
        </div>
        <span className="text-[10px] font-bold text-rose-900 bg-white/95 border border-rose-200/90 px-2 py-1 rounded-md shrink-0">
          {t('helper_dashboard.job_card_high_priority')}
        </span>
      </div>
    ) : tier === 'best' ? (
      <div className="px-4 py-2.5 flex items-center justify-between border-b border-emerald-200/70 bg-emerald-50/85">
        <div className="flex items-center gap-2 min-w-0">
          <Icons.Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
          <span className="text-[11px] font-bold text-emerald-950 tracking-wide uppercase">{t('helper_dashboard.job_card_best_match')}</span>
        </div>
        <span className="text-[10px] font-bold text-emerald-900 bg-white/95 border border-emerald-200/90 px-2 py-1 rounded-md flex items-center gap-1 shrink-0 tabular-nums">
          <Icons.Zap className="w-3 h-3 text-emerald-600 shrink-0" /> {t('helper_dashboard.compatibility', { pct: 95 })}
        </span>
      </div>
    ) : (
      <div className="px-4 py-2 border-b border-slate-100/90 bg-slate-50/70">
        <div className="flex items-center gap-2 min-w-0">
          <Icons.CircleDot className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.12em]">{t('helper_dashboard.job_card_standard')}</span>
        </div>
      </div>
    );

  const ctaBase =
    'flex-1 inline-flex min-h-[42px] px-3 rounded-[var(--lh-radius-md)] font-bold text-sm items-center justify-center gap-2 transition-all duration-200';

  return (
    <LhCard
      padding="none"
      className={clsx(
        'group/card h-full overflow-hidden border bg-white/95 transition-all duration-300',
        'hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-900/10 motion-reduce:transform-none',
        'hover:ring-2 hover:ring-blue-500/15',
        tier === 'urgent' &&
          'border-rose-200/90 ring-1 ring-rose-200/50 shadow-md shadow-rose-500/10 motion-reduce:animate-none animate-pulse',
        tier === 'best' && 'border-emerald-200/80 ring-1 ring-emerald-100/60 shadow-sm shadow-emerald-500/10',
        tier === 'normal' && 'border-slate-200/80',
      )}
    >
      {header}

      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <img
            src={job.clientAvatar}
            alt=""
            className="w-10 h-10 rounded-full object-cover border border-slate-100 shadow-sm"
          />
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => onViewClientProfile?.(job)}
              className="block max-w-full truncate text-left font-bold leading-tight text-slate-900 transition-colors hover:text-blue-700"
            >
              {job.clientName}
            </button>
            <p className="text-xs text-slate-500 flex items-center gap-1 font-medium truncate">{translateCategory(job.category, t)}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onViewDetails?.(job)}
          className="text-base font-bold text-slate-900 mb-2 leading-snug line-clamp-2 text-left hover:text-blue-700"
        >
          {job.title}
        </button>
        <p className="text-sm text-slate-600 mb-4 leading-relaxed line-clamp-2">{job.description}</p>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-[var(--lh-radius-sm)] border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-800">
            <Icons.BadgeCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> {t('helper_dashboard.lead_quality', { pct: qualityScore })}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-[var(--lh-radius-sm)] border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-800">
            <Icons.Coins className="w-3.5 h-3.5 text-blue-600 shrink-0" /> {t('helper_dashboard.lead_cost', { count: leadCost })}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-[var(--lh-radius-sm)] border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-900">
            <Icons.Users className="w-3.5 h-3.5 text-amber-600 shrink-0" /> {t('helper_dashboard.lead_competition', { count: helperLimit })}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-[var(--lh-radius-sm)] border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-bold text-blue-800">
            <Icons.UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" /> {t('helper_dashboard.applications_count', { count: applicationsCount })}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-[var(--lh-radius-sm)] border border-slate-200/90 bg-slate-50/80 px-2.5 py-1.5 text-xs font-medium text-slate-700">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {formatJobSchedule(job, t)}
          </span>
          {isBeautyScheduledJob(job) ? (
            <span className="inline-flex items-center gap-1 rounded-[var(--lh-radius-sm)] border border-violet-100 bg-violet-50 px-2.5 py-1.5 text-xs font-bold text-violet-800">
              <span aria-hidden>🕒</span>
              {job.preferredTime}
              <span className="font-semibold text-violet-600/90">· {t('jobs.scheduled_time_badge')}</span>
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1.5 rounded-[var(--lh-radius-sm)] border border-slate-200/90 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />{' '}
            {distanceKm != null
              ? t('helper_dashboard.distance_km', { km: distanceKm.toFixed(1) })
              : job.location}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-[var(--lh-radius-sm)] border border-slate-200/90 bg-slate-50/90 px-2.5 py-1.5 text-xs font-semibold text-slate-700">
            <Icons.Handshake className="w-3.5 h-3.5 text-slate-500 shrink-0" /> {t('helper_dashboard.compensation_neutral')}
          </span>
        </div>
      </div>
      <div className="mx-4 mb-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2.5">
        <p className="line-clamp-2 text-xs font-semibold leading-relaxed text-slate-600">
          {t('helper_dashboard.lead_unlock_note')}
        </p>
      </div>
      <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/60 flex flex-col gap-2">
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
          <button type="button" disabled className={`${ctaBase} cursor-not-allowed bg-emerald-100 text-emerald-800 border border-emerald-200/80`}>
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {t('helper_dashboard.applied_sent')}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onApply(job.id)}
            disabled={isApplying}
            className={`${ctaBase} bg-blue-600 text-white border border-blue-600/90 hover:bg-blue-700 hover:shadow-md hover:shadow-blue-600/15 active:scale-[0.99] disabled:opacity-70 disabled:pointer-events-none`}
          >
            {isApplying ? (
              <>
                <Icons.Loader2 className="w-4 h-4 animate-spin shrink-0" /> {t('helper_dashboard.apply_sending')}
              </>
            ) : (
              <>
                <Check className="w-4 h-4 shrink-0" /> {t('helper_dashboard.apply_now')}
              </>
            )}
          </button>
        )}
      </div>
    </LhCard>
  );
}
