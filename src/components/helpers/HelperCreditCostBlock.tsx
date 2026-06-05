import * as Icons from 'lucide-react';
import type { Job } from '@/types/job';
import { getHelperLeadCreditSummary, getHelperCreditPublicDisplay } from '@/utils/helperCreditDisplay';

type TFn = (key: string, vars?: Record<string, string | number>) => string;

type Props = {
  job: Job;
  t: TFn;
  distanceKm?: number | null;
  variant?: 'compact' | 'detail' | 'feed';
  showHireEstimate?: boolean;
};

function CreditLines({
  display,
  t,
  compact = false,
  showTotal = true,
}: {
  display: ReturnType<typeof getHelperCreditPublicDisplay>;
  t: TFn;
  compact?: boolean;
  showTotal?: boolean;
}) {
  const textSize = compact ? 'text-[10px]' : 'text-sm';

  return (
    <ul className={`space-y-1 ${compact ? 'leading-snug' : 'mt-2 space-y-1.5'} ${textSize} font-bold text-slate-800`}>
      <li className="flex justify-between gap-2">
        <span className={compact ? 'text-blue-800' : 'text-slate-600'}>
          {compact
            ? t('helper_dashboard.credit_apply_cost', { count: display.applyCost })
            : t('helper_dashboard.credit_apply_label')}
        </span>
        {!compact ? <span className="tabular-nums text-blue-900">{display.applyCost} LC</span> : null}
      </li>
      <li className="flex justify-between gap-2">
        <span className={compact ? 'text-blue-800' : 'text-slate-600'}>
          {compact
            ? t('helper_dashboard.credit_job_cost', { count: display.jobCost })
            : t('helper_dashboard.credit_job_cost_label')}
        </span>
        {!compact ? <span className="tabular-nums text-blue-800">{display.jobCost} LC</span> : null}
      </li>
      <li className="flex justify-between gap-2">
        <span className={compact ? 'text-blue-700/90' : 'text-slate-600'}>
          {compact
            ? t('helper_dashboard.credit_cost_if_selected', { count: display.hireEstimate })
            : t('helper_dashboard.credit_hire_estimate_label')}
        </span>
        {!compact ? <span className="tabular-nums text-blue-800">+{display.hireEstimate} LC</span> : null}
      </li>
      {showTotal ? (
        <li
          className={`flex justify-between gap-2 border-t border-blue-100/80 pt-1.5 text-blue-900 ${
            compact ? '' : 'pt-2'
          }`}
        >
          <span>
            {compact
              ? t('helper_dashboard.credit_total_estimated', { count: display.totalEstimate })
              : t('helper_dashboard.credit_total_estimate_label')}
          </span>
          {!compact ? <span className="tabular-nums">{display.totalEstimate} LC</span> : null}
        </li>
      ) : null}
    </ul>
  );
}

export function HelperCreditCostBlock({
  job,
  t,
  distanceKm,
  variant = 'detail',
  showHireEstimate = false,
}: Props) {
  const display = getHelperCreditPublicDisplay(getHelperLeadCreditSummary(job, distanceKm));

  if (variant === 'feed') {
    return (
      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] font-bold leading-snug text-blue-800">
        <Icons.Coins className="h-3 w-3 shrink-0 text-blue-600" aria-hidden />
        <span>{t('helper_dashboard.credit_apply_cost', { count: display.applyCost })}</span>
        {showHireEstimate ? (
          <>
            <span className="text-slate-300" aria-hidden>
              ·
            </span>
            <span>{t('helper_dashboard.credit_total_estimated', { count: display.totalEstimate })}</span>
          </>
        ) : null}
      </p>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="flex gap-1 text-blue-800">
        <Icons.Coins className="mt-0.5 h-3 w-3 shrink-0 text-blue-600" aria-hidden />
        <CreditLines display={display} t={t} compact showTotal={showHireEstimate} />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50 to-sky-50/90 p-4">
      <p className="text-[10px] font-black uppercase tracking-wider text-blue-700">
        {t('helper_dashboard.credit_block_title')}
      </p>
      <CreditLines display={display} t={t} showTotal />
    </div>
  );
}
