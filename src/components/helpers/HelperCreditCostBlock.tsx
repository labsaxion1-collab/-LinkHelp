import * as Icons from 'lucide-react';
import type { Job } from '@/types/job';
import { getHelperLeadCreditSummary } from '@/utils/helperCreditDisplay';

type TFn = (key: string, vars?: Record<string, string | number>) => string;

type Props = {
  job: Job;
  t: TFn;
  distanceKm?: number | null;
  variant?: 'compact' | 'detail';
};

export function HelperCreditCostBlock({ job, t, distanceKm, variant = 'detail' }: Props) {
  const costs = getHelperLeadCreditSummary(job, distanceKm);

  if (variant === 'compact') {
    return (
      <div className="space-y-0.5 text-[10px] font-semibold leading-snug text-blue-800">
        <p className="flex items-center gap-1">
          <Icons.Coins className="h-3 w-3 shrink-0 text-blue-600" />
          {t('helper_dashboard.credit_cost_interest', { count: costs.interestCost })}
        </p>
        <p className="pl-4 text-blue-700/90">
          {t('helper_dashboard.credit_cost_if_selected', { count: costs.selectedCost })}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50 to-sky-50/90 p-4">
      <p className="text-[10px] font-black uppercase tracking-wider text-blue-700">
        {t('helper_dashboard.credit_block_title')}
      </p>
      <ul className="mt-2 space-y-1.5 text-sm font-bold text-slate-800">
        <li>{t('helper_dashboard.credit_interest_line', { count: costs.interestCost })}</li>
        <li>{t('helper_dashboard.credit_selected_line', { count: costs.selectedCost })}</li>
        <li className="text-blue-900">{t('helper_dashboard.credit_total_line', { count: costs.total })}</li>
      </ul>
    </div>
  );
}
