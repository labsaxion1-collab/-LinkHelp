import * as Icons from 'lucide-react';
import { isPreferredDateComplete, isPreferredTimeComplete } from '@/utils/requestSchedule';

type Props = {
  t: (key: string, vars?: Record<string, string | number>) => string;
  preferredDateIso: string;
  setPreferredDateIso: (v: string) => void;
  preferredTimeSpecific: string;
  setPreferredTimeSpecific: (v: string) => void;
};

function todayIsoLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function CreateRequestConfirmStep({
  t,
  preferredDateIso,
  setPreferredDateIso,
  preferredTimeSpecific,
  setPreferredTimeSpecific,
}: Props) {
  const dateComplete = isPreferredDateComplete(preferredDateIso);
  const timeComplete = isPreferredTimeComplete(preferredTimeSpecific);
  const stepComplete = dateComplete && timeComplete;
  const minDate = todayIsoLocal();

  return (
    <div className="animate-in fade-in duration-300 space-y-4">
      <div>
        <h4 className="text-2xl font-bold text-gray-900">{t('create_modal.preferred_date')}</h4>
        <p className="text-gray-500 text-sm mt-1">{t('create_modal.confirm_when')}</p>
      </div>

      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-sm space-y-5">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-bold text-slate-800">{t('create_modal.work_date_label')}</span>
          <div className="flex items-center gap-3 rounded-xl border-2 border-slate-200 bg-slate-50/60 px-3 transition-colors focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
            <Icons.Calendar className="h-5 w-5 shrink-0 text-blue-600" aria-hidden />
            <input
              type="date"
              required
              value={preferredDateIso}
              min={minDate}
              onChange={(e) => setPreferredDateIso(e.target.value)}
              className="min-h-[48px] w-full flex-1 touch-manipulation bg-transparent text-base font-bold text-slate-800 outline-none"
            />
          </div>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-bold text-slate-800">{t('create_modal.work_time_label')}</span>
          <div className="flex items-center gap-3 rounded-xl border-2 border-slate-200 bg-slate-50/60 px-3 transition-colors focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
            <Icons.Clock className="h-5 w-5 shrink-0 text-blue-600" aria-hidden />
            <input
              type="time"
              required
              value={preferredTimeSpecific}
              onChange={(e) => setPreferredTimeSpecific(e.target.value)}
              className="min-h-[48px] w-full flex-1 touch-manipulation bg-transparent text-base font-bold text-slate-800 outline-none"
            />
          </div>
        </label>
      </div>

      {!stepComplete ? (
        <p className="text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          {!dateComplete ? t('create_modal.confirm_date_required') : t('create_modal.confirm_time_required')}
        </p>
      ) : (
        <p className="text-sm font-medium text-emerald-700 flex items-center gap-2">
          <Icons.CheckCircle2 className="w-4 h-4 shrink-0" />
          {t('create_modal.confirm_ready')}
        </p>
      )}
    </div>
  );
}

export function isConfirmStepComplete(preferredDateIso: string, preferredTimeSpecific: string): boolean {
  return isPreferredDateComplete(preferredDateIso) && isPreferredTimeComplete(preferredTimeSpecific);
}
