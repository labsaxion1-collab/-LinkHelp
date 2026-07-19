import * as Icons from 'lucide-react';
import type { Job } from '@/types/job';
import { getHelperLeadCreditSummary, getHelperCreditPublicDisplay } from '@/utils/helperCreditDisplay';
import { getHelperLeadCreditQuote } from '@/utils/helperLeadCreditQuote';

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
}: {
  display: ReturnType<typeof getHelperCreditPublicDisplay>;
  t: TFn;
  compact?: boolean;
}) {
  const textSize = compact ? 'text-[10px]' : 'text-sm';

  return (
    <ul className={`space-y-1 ${compact ? 'leading-snug' : 'mt-2 space-y-1.5'} ${textSize} font-bold text-slate-800`}>
      <li>{t('helper_dashboard.split_normal_cost_now', { count: display.applyCost })}</li>
      <li>{t('helper_dashboard.split_normal_if_hired', { count: display.hireEstimate })}</li>
      <li className={`border-t border-blue-100/80 pt-1.5 text-blue-900 ${compact ? '' : 'pt-2'}`}>
        {t('helper_dashboard.split_normal_total', { count: display.totalEstimate })}
      </li>
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
  const quote = getHelperLeadCreditQuote(job, { distanceKm });
  const display = getHelperCreditPublicDisplay(quote);

  if (variant === 'feed') {
    return (
      <p className="truncate text-[9px] font-semibold leading-snug text-blue-800">
        {showHireEstimate
          ? t('helper_dashboard.credit_feed_inline', {
              apply: display.applyCost,
              total: display.totalEstimate,
            })
          : t('helper_dashboard.credit_apply_short', { count: display.applyCost })}
      </p>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="flex gap-1 text-blue-800">
        <Icons.Coins className="mt-0.5 h-3 w-3 shrink-0 text-blue-600" aria-hidden />
        <CreditLines display={display} t={t} compact />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50 to-sky-50/90 p-4">
      <p className="text-[10px] font-black uppercase tracking-wider text-blue-700">
        {t('helper_dashboard.credit_block_title')}
      </p>
      <CreditLines display={display} t={t} />
    </div>
  );
}
