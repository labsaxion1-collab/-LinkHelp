import * as Icons from 'lucide-react';
import {
  BEAUTY_PREFERRED_TIME_SLOTS,
  type PreferredDateMode,
} from '@/utils/requestSchedule';

type Props = {
  t: (key: string, vars?: Record<string, string | number>) => string;
  selectedCategory: string;
  preferredDateMode: PreferredDateMode;
  setPreferredDateMode: (m: PreferredDateMode) => void;
  preferredDateIso: string;
  setPreferredDateIso: (v: string) => void;
  preferredTimeSpecific: string;
  setPreferredTimeSpecific: (v: string) => void;
};

export function CreateRequestConfirmStep({
  t,
  selectedCategory,
  preferredDateMode,
  setPreferredDateMode,
  preferredDateIso,
  setPreferredDateIso,
  preferredTimeSpecific,
  setPreferredTimeSpecific,
}: Props) {
  const isBeauty = selectedCategory === 'beauty';
  const dateComplete =
    preferredDateMode === 'today' ||
    preferredDateMode === 'tomorrow' ||
    (preferredDateMode === 'pick' && Boolean(preferredDateIso));
  const timeComplete = !isBeauty || Boolean(preferredTimeSpecific.trim());
  const stepComplete = dateComplete && timeComplete;

  return (
    <div className="animate-in fade-in duration-300 space-y-4">
      <div>
        <h4 className="text-2xl font-bold text-gray-900">{t('create_modal.preferred_date')}</h4>
        <p className="text-gray-500 text-sm mt-1">
          {isBeauty ? t('create_modal.beauty_schedule_sub') : t('create_modal.confirm_when')}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t('create_modal.preferred_date')}</p>
        <div className="grid grid-cols-3 gap-2">
          {(['today', 'tomorrow', 'pick'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setPreferredDateMode(mode)}
              className={`min-h-[44px] rounded-xl border-2 px-2 text-sm font-black transition-colors ${
                preferredDateMode === mode
                  ? 'border-blue-600 bg-blue-50 text-blue-900'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-blue-200'
              }`}
            >
              {mode === 'today'
                ? t('create_modal.date_today')
                : mode === 'tomorrow'
                  ? t('create_modal.date_tomorrow')
                  : t('create_modal.date_pick')}
            </button>
          ))}
        </div>
        {preferredDateMode === 'pick' ? (
          <input
            type="date"
            value={preferredDateIso}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setPreferredDateIso(e.target.value)}
            className="w-full min-h-[44px] rounded-xl border-2 border-gray-200 px-3 text-sm font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
          />
        ) : null}

        {isBeauty ? (
          <div className="pt-2 border-t border-slate-200">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
              {t('create_modal.preferred_time_select')}
            </p>
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
              {BEAUTY_PREFERRED_TIME_SLOTS.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setPreferredTimeSpecific(slot)}
                  className={`min-h-[40px] rounded-lg border text-xs font-black transition-colors ${
                    preferredTimeSpecific === slot
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
            <label className="mt-2 flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 shrink-0">{t('create_modal.preferred_time_custom')}</span>
              <input
                type="time"
                value={preferredTimeSpecific}
                onChange={(e) => setPreferredTimeSpecific(e.target.value)}
                className="min-h-[40px] flex-1 rounded-lg border-2 border-slate-200 px-2 text-sm font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
              />
            </label>
          </div>
        ) : null}
      </div>

      {!stepComplete ? (
        <p className="text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          {!dateComplete ? t('create_modal.confirm_date_required') : t('create_modal.preferred_time_required')}
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

export function isConfirmStepComplete(
  preferredDateMode: PreferredDateMode,
  preferredDateIso: string,
  category: string,
  preferredTimeSpecific: string,
): boolean {
  const dateOk =
    preferredDateMode === 'today' ||
    preferredDateMode === 'tomorrow' ||
    (preferredDateMode === 'pick' && Boolean(preferredDateIso));
  if (category !== 'beauty') return dateOk;
  return dateOk && Boolean(preferredTimeSpecific.trim());
}
