import { PremiumDatePicker } from '@/components/design-system/PremiumDatePicker';
import { PremiumTimePicker } from '@/components/design-system/PremiumTimePicker';
import * as Icons from 'lucide-react';
import {
  isPreferredDateComplete,
  isPreferredTimeComplete,
  PREFERRED_WORK_HOUR_SLOTS,
} from '@/utils/requestSchedule';
import { todayIsoLocal } from '@/utils/calendar';
import type { AppLanguage } from '@/services/translationService';

type Props = {
  t: (key: string, vars?: Record<string, string | number>) => string;
  language: AppLanguage;
  preferredDateIso: string;
  setPreferredDateIso: (v: string) => void;
  preferredTimeSpecific: string;
  setPreferredTimeSpecific: (v: string) => void;
};

export function CreateRequestConfirmStep({
  t,
  language,
  preferredDateIso,
  setPreferredDateIso,
  preferredTimeSpecific,
  setPreferredTimeSpecific,
}: Props) {
  const dateComplete = isPreferredDateComplete(preferredDateIso);
  const timeComplete = isPreferredTimeComplete(preferredTimeSpecific);
  const stepComplete = dateComplete && timeComplete;

  return (
    <div className="animate-in fade-in duration-300 space-y-4">
      <div>
        <h4 className="text-2xl font-bold text-[#0F172A]">{t('create_modal.preferred_date')}</h4>
        <p className="mt-1 text-sm text-[#64748B]">{t('create_modal.confirm_when')}</p>
      </div>

      <div className="space-y-5 rounded-[28px] border border-[rgba(37,99,255,0.15)] bg-[#F5F7FB] p-4 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:p-5">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-bold text-[#0F172A]">{t('create_modal.work_date_label')}</span>
          <PremiumDatePicker
            value={preferredDateIso}
            onChange={setPreferredDateIso}
            minDate={todayIsoLocal()}
            placeholder={t('create_modal.date_pick')}
            todayLabel={t('create_modal.date_today')}
            clearLabel={t('create_modal.date_picker_clear')}
            language={language}
            ariaLabel={t('create_modal.work_date_label')}
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-bold text-[#0F172A]">{t('create_modal.work_time_label')}</span>
          <PremiumTimePicker
            value={preferredTimeSpecific}
            onChange={setPreferredTimeSpecific}
            options={PREFERRED_WORK_HOUR_SLOTS}
            placeholder={t('create_modal.preferred_time_select')}
            clearLabel={t('create_modal.date_picker_clear')}
            ariaLabel={t('create_modal.work_time_label')}
          />
        </div>
      </div>

      {!stepComplete ? (
        <p className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
          {!dateComplete ? t('create_modal.confirm_date_required') : t('create_modal.confirm_time_required')}
        </p>
      ) : (
        <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
          <Icons.CheckCircle2 className="h-4 w-4 shrink-0" />
          {t('create_modal.confirm_ready')}
        </p>
      )}
    </div>
  );
}

export function isConfirmStepComplete(preferredDateIso: string, preferredTimeSpecific: string): boolean {
  return isPreferredDateComplete(preferredDateIso) && isPreferredTimeComplete(preferredTimeSpecific);
}
