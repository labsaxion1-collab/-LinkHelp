import * as Icons from 'lucide-react';
import type { Job } from '@/types/job';
import { formatJobBudgetDisplay } from '@/utils/formatJobBudget';
import { translateCategory } from '@/utils/translateCategory';

type Props = {
  job: Job;
  distanceKm: number;
  t: (key: string, vars?: Record<string, string | number>) => string;
  onViewOpportunity: () => void;
};

export function JobMapOpportunityCard({ job, distanceKm, t, onViewOpportunity }: Props) {
  const clientName = job.clientName?.trim() || t('live_map.client_fallback');

  return (
    <div className="min-w-[220px] max-w-[260px] space-y-3 pt-0.5">
      <div>
        <span className="text-[10px] font-bold uppercase tracking-wide text-blue-600">
          {translateCategory(job.category, t)}
        </span>
        <p className="mt-1 text-sm font-black text-gray-900 leading-snug">{clientName}</p>
        <p className="text-xs font-medium text-gray-500 line-clamp-2">{job.title}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-gray-600">
        <span className="inline-flex items-center gap-1">
          <Icons.MapPin className="h-3.5 w-3.5 text-gray-400" />
          {t('live_map.distance_km', { km: distanceKm })}
        </span>
        <span className="inline-flex items-center gap-1 text-emerald-700">
          <Icons.DollarSign className="h-3.5 w-3.5" />
          {formatJobBudgetDisplay(job, t)}
        </span>
      </div>
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
