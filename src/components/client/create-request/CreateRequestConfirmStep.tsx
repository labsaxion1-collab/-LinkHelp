import * as Icons from 'lucide-react';
import {
  type PreferredDateMode,
  type PreferredTimeChoice,
  isPreferredTimeComplete,
} from '@/utils/requestSchedule';

type Props = {
  t: (key: string, vars?: Record<string, string | number>) => string;
  selectedCategory: string;
  preferredDateMode: PreferredDateMode;
  setPreferredDateMode: (m: PreferredDateMode) => void;
  preferredDateIso: string;
  setPreferredDateIso: (v: string) => void;
  preferredTimeChoice: PreferredTimeChoice;
  setPreferredTimeChoice: (c: PreferredTimeChoice) => void;
  preferredTimeSpecific: string;
  setPreferredTimeSpecific: (v: string) => void;
};

export function CreateRequestConfirmStep({
  t,
  preferredDateMode,
  setPreferredDateMode,
  preferredDateIso,
  setPreferredDateIso,
  preferredTimeChoice,
  setPreferredTimeChoice,
  preferredTimeSpecific,
  setPreferredTimeSpecific,
}: Props) {
  const dateComplete =
    preferredDateMode === 'today' ||
    preferredDateMode === 'tomorrow' ||
    (preferredDateMode === 'pick' && Boolean(preferredDateIso));
  const timeComplete = isPreferredTimeComplete(preferredTimeChoice, preferredTimeSpecific);
  const stepComplete = dateComplete && timeComplete;

  return (
    <div className="animate-in fade-in duration-300 space-y-4">
      <div>
        <h4 className="text-2xl font-bold text-gray-900">{t('create_modal.preferred_date')}</h4>
        <p className="text-gray-500 text-sm mt-1">{t('create_modal.confirm_when')}</p>
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
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t('create_modal.preferred_time')}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(['morning', 'afternoon', 'evening', 'pick'] as const).map((choice) => (
            <button
              key={choice}
              type="button"
              onClick={() => {
                setPreferredTimeChoice(choice);
                if (choice !== 'pick') setPreferredTimeSpecific('');
              }}
              className={`min-h-[44px] rounded-xl border-2 px-2 text-sm font-black transition-colors ${
                preferredTimeChoice === choice
                  ? 'border-blue-600 bg-blue-50 text-blue-900'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-blue-200'
              }`}
            >
              {choice === 'morning'
                ? t('create_modal.time_morning')
                : choice === 'afternoon'
                  ? t('create_modal.time_afternoon')
                  : choice === 'evening'
                    ? t('create_modal.time_evening')
                    : t('create_modal.time_pick')}
            </button>
          ))}
        </div>
        {preferredTimeChoice === 'pick' ? (
          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-600">{t('create_modal.time_pick_hint')}</span>
            <input
              type="time"
              value={preferredTimeSpecific}
              onChange={(e) => setPreferredTimeSpecific(e.target.value)}
              className="w-full min-h-[48px] rounded-xl border-2 border-blue-200 bg-white px-3 text-lg font-black text-slate-900 focus:border-blue-500 focus:outline-none"
            />
          </label>
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
  preferredTimeChoice: PreferredTimeChoice,
  preferredTimeSpecific: string,
): boolean {
  const dateOk =
    preferredDateMode === 'today' ||
    preferredDateMode === 'tomorrow' ||
    (preferredDateMode === 'pick' && Boolean(preferredDateIso));
  return dateOk && isPreferredTimeComplete(preferredTimeChoice, preferredTimeSpecific);
}
