import * as Icons from 'lucide-react';
import type { PreferredDateMode } from '@/utils/requestSchedule';

type Props = {
  t: (key: string, vars?: Record<string, string | number>) => string;
  preferredDateMode: PreferredDateMode;
  setPreferredDateMode: (m: PreferredDateMode) => void;
  preferredDateIso: string;
  setPreferredDateIso: (v: string) => void;
};

export function CreateRequestConfirmStep({
  t,
  preferredDateMode,
  setPreferredDateMode,
  preferredDateIso,
  setPreferredDateIso,
}: Props) {
  const dateComplete =
    preferredDateMode === 'today' ||
    preferredDateMode === 'tomorrow' ||
    (preferredDateMode === 'pick' && Boolean(preferredDateIso));

  return (
    <div className="animate-in fade-in duration-300 space-y-5">
      <div>
        <h4 className="text-2xl font-bold text-gray-900">{t('create_modal.preferred_date')}</h4>
        <p className="text-gray-500 text-sm mt-1">{t('create_modal.confirm_when')}</p>
      </div>

      <div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {(['today', 'tomorrow', 'pick'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setPreferredDateMode(mode)}
              className={`min-h-[52px] rounded-2xl border-2 px-4 text-sm font-black transition-colors ${
                preferredDateMode === mode ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-gray-200 bg-white text-gray-700 hover:border-blue-200'
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
          <label className="mt-3 block">
            <span className="text-xs font-bold text-slate-500 uppercase">{t('create_modal.confirm_custom_date')}</span>
            <input
              type="date"
              value={preferredDateIso}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setPreferredDateIso(e.target.value)}
              className="mt-1.5 w-full min-h-[48px] rounded-xl border-2 border-gray-200 px-4 text-base font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
            />
          </label>
        ) : null}
      </div>

      {!dateComplete ? (
        <p className="text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          {t('create_modal.confirm_date_required')}
        </p>
      ) : (
        <p className="text-sm font-medium text-emerald-700 flex items-center gap-2">
          <Icons.CheckCircle2 className="w-4 h-4" />
          {t('create_modal.confirm_ready')}
        </p>
      )}
    </div>
  );
}

export function isConfirmStepComplete(
  preferredDateMode: PreferredDateMode,
  preferredDateIso: string,
): boolean {
  return (
    preferredDateMode === 'today' ||
    preferredDateMode === 'tomorrow' ||
    (preferredDateMode === 'pick' && Boolean(preferredDateIso))
  );
}
