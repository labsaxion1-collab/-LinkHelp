import * as Icons from 'lucide-react';
import type { Job } from '@/types/job';
import { formatJobBudgetDisplay } from '@/utils/formatJobBudget';
import { translateCategory, translateJobTitle } from '@/utils/translateCategory';
import { getHelperLeadCreditSummary } from '@/utils/helperCreditDisplay';
import { isRemoteJob } from '@/utils/calculateHelperLeadCreditCost';

type Props = {
  job: Job;
  distanceKm: number | null;
  applicationsCount?: number;
  t: (key: string, vars?: Record<string, string | number>) => string;
  onViewOpportunity: () => void;
};

export function JobMapOpportunityCard({
  job,
  distanceKm,
  applicationsCount = 0,
  t,
  onViewOpportunity,
}: Props) {
  const clientName = job.clientName?.trim() || t('live_map.client_fallback');
  const remote = isRemoteJob(job);
  const costs = getHelperLeadCreditSummary(job, remote ? null : distanceKm);
  const distanceLabel = remote
    ? t('jobs.remote')
    : distanceKm != null
      ? t('live_map.distance_km', { km: distanceKm })
      : '—';

  return (
    <div className="min-w-[220px] max-w-[260px] space-y-2.5 pt-0.5">
      <div>
        <span className="text-[10px] font-bold uppercase tracking-wide text-blue-600">
          {translateCategory(job.category, t)}
        </span>
        <p className="mt-1 text-sm font-black text-gray-900 leading-snug">{clientName}</p>
        <p className="text-xs font-medium text-gray-500 line-clamp-2">
          {translateJobTitle(job.title, job.category, job.subcategory, t)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-gray-600">
        <span className="inline-flex items-center gap-1">
          <Icons.MapPin className="h-3.5 w-3.5 text-gray-400" />
          {distanceLabel}
        </span>
        <span className="inline-flex items-center gap-1 text-emerald-700">
          <Icons.DollarSign className="h-3.5 w-3.5" />
          {formatJobBudgetDisplay(job, t)}
        </span>
        <span className="inline-flex items-center gap-1 text-blue-800">
          <Icons.Coins className="h-3.5 w-3.5" />
          {t('helper_dashboard.credit_estimated_total', { count: costs.estimatedTotal })}
        </span>
        <span className="inline-flex items-center gap-1 text-slate-600">
          <Icons.Users className="h-3.5 w-3.5" />
          {t('helper_dashboard.applications_count', { count: applicationsCount })}
        </span>
      </div>
      {job.urgency === 'high' ? (
        <span className="inline-block rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-black uppercase text-rose-800">
          {t('helper_dashboard.job_card_high_priority')}
        </span>
      ) : null}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onViewOpportunity();
        }}
        className="w-full min-h-[40px] rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-700 transition-colors"
      >
        {t('live_map.view_opportunity')}
      </button>
    </div>
  );
}
