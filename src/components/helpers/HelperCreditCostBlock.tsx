import * as Icons from 'lucide-react';
import type { Job } from '@/types/job';
import { getHelperLeadCreditSummary, getHelperCreditPublicDisplay } from '@/utils/helperCreditDisplay';

type TFn = (key: string, vars?: Record<string, string | number>) => string;

type Props = {
  job: Job;
  t: TFn;
  distanceKm?: number | null;
  variant?: 'compact' | 'detail';
  showHireEstimate?: boolean;
};

export function HelperCreditCostBlock({
  job,
  t,
  distanceKm,
  variant = 'detail',
  showHireEstimate = false,
}: Props) {
  const costs = getHelperLeadCreditSummary(job, distanceKm);
  const display = getHelperCreditPublicDisplay(costs);

  if (variant === 'compact') {
    return (
      <div className="space-y-0.5 text-[10px] font-bold leading-snug text-blue-800">
        <p className="flex items-center gap-1">
          <Icons.Coins className="h-3 w-3 shrink-0 text-blue-600" />
          {t('helper_dashboard.credit_apply_cost', { count: display.applyCost })}
        </p>
        {showHireEstimate ? (
          <p className="pl-4 text-blue-700/90">
            {t('helper_dashboard.credit_cost_if_selected', { count: display.hireEstimate })}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50 to-sky-50/90 p-4">
      <p className="text-[10px] font-black uppercase tracking-wider text-blue-700">
        {t('helper_dashboard.credit_block_title')}
      </p>
      <ul className="mt-2 space-y-1.5 text-sm font-bold text-slate-800">
        <li className="flex justify-between gap-2">
          <span className="text-slate-600">{t('helper_dashboard.credit_apply_label')}</span>
          <span className="tabular-nums text-blue-900">{display.applyCost} LC</span>
        </li>
        <li className="flex justify-between gap-2">
          <span className="text-slate-600">{t('helper_dashboard.credit_hire_estimate_label')}</span>
          <span className="tabular-nums text-blue-800">+{display.hireEstimate} LC</span>
        </li>
        {showHireEstimate ? (
          <li className="flex justify-between gap-2 border-t border-blue-100/80 pt-2 text-blue-900">
            <span>{t('helper_dashboard.credit_total_estimate_label')}</span>
            <span className="tabular-nums">{display.totalEstimate} LC</span>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
