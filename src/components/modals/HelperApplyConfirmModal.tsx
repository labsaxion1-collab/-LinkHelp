import { PremiumResponsiveModal } from '@/components/design-system/PremiumResponsiveModal';
import type { AppLanguage } from '@/services/translationService';
import { formatLinkCredits } from '@/utils/formatLinkCredits';
import type { HelperApplicationType } from '@/utils/helperOpportunityApply';
import { getApplicationTypeLabelKey } from '@/utils/helperOpportunityApply';

type Props = {
  open: boolean;
  submitting?: boolean;
  applicationType: HelperApplicationType;
  linkCreditsCost: number;
  language?: AppLanguage;
  onConfirm: () => void;
  onCancel: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

export function HelperApplyConfirmModal({
  open,
  submitting = false,
  applicationType,
  linkCreditsCost,
  language = 'pt',
  onConfirm,
  onCancel,
  t,
}: Props) {
  const typeLabel = t(getApplicationTypeLabelKey(applicationType));
  const costLabel = formatLinkCredits(linkCreditsCost, language);

  return (
    <PremiumResponsiveModal
      open={open}
      onClose={submitting ? () => undefined : onCancel}
      layer="elevated"
      title={t('helper_dashboard.apply_confirm_title')}
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            disabled={submitting}
            onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            {t('helper_dashboard.apply_confirm_no')}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-gradient-to-br from-[#2563FF] to-[#1557F0] px-4 py-3 text-sm font-black text-white shadow-[0_8px_22px_rgba(37,99,255,0.28)] transition hover:brightness-105 disabled:opacity-60"
          >
            {submitting ? t('helper_dashboard.apply_sending') : t('helper_dashboard.apply_confirm_yes')}
          </button>
        </div>
      }
    >
      <p className="text-sm font-medium leading-relaxed text-slate-600">
        {t('helper_dashboard.apply_confirm_body', { type: typeLabel, cost: costLabel })}
      </p>
    </PremiumResponsiveModal>
  );
}
