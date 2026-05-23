import * as Icons from 'lucide-react';
import type { Job } from '@/types/job';
import { formatJobBudgetDisplay } from '@/utils/formatJobBudget';
import { DesktopBackButton } from '@/components/layout/DesktopBackButton';

type Props = {
  job: Job | null;
  open: boolean;
  onClose: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  translateCategory: (raw: string, tf: (k: string) => string) => string;
  formatJobSchedule: (date: Job['date'], tf: (k: string, vars?: Record<string, string | number>) => string) => string;
  distanceKm?: number | null;
};

export function HelperOpportunityDetailModal({
  job,
  open,
  onClose,
  t,
  translateCategory,
  formatJobSchedule,
  distanceKm,
}: Props) {
  if (!open || !job) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
        aria-label={t('common.close')}
        onClick={onClose}
      />
      <section className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-slate-100 bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <DesktopBackButton alwaysVisible onClose={onClose} />
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"
          >
            <Icons.X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5 space-y-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wide text-blue-600">
              {translateCategory(job.category, t)}
            </p>
            <h2 className="mt-1 text-xl font-black text-slate-950">{job.title}</h2>
          </div>
          <p className="text-sm font-medium leading-relaxed text-slate-600">{job.description}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-[10px] font-bold uppercase text-slate-400">{t('helper_dashboard.distance_km', { km: distanceKm?.toFixed(1) ?? '—' })}</p>
              <p className="mt-1 text-sm font-bold text-slate-900 truncate">{job.location}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-[10px] font-bold uppercase text-slate-400">{t('create_modal.budget_hint_label')}</p>
              <p className="mt-1 text-sm font-bold text-slate-900">{formatJobBudgetDisplay(job, t)}</p>
            </div>
          </div>
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <Icons.Clock className="h-4 w-4 text-slate-400" />
            {formatJobSchedule(job.date, t)}
          </p>
        </div>
      </section>
    </div>
  );
}
