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
  walletBalance?: number | null;
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
  walletBalance = null,
  language = 'pt',
  onConfirm,
  onCancel,
  t,
}: Props) {
  const typeLabel = t(getApplicationTypeLabelKey(applicationType));
  const costLabel = formatLinkCredits(linkCreditsCost, language);
  const currentBalanceLabel =
    walletBalance == null
      ? t('helper_dashboard.apply_wallet_balance_loading')
      : formatLinkCredits(walletBalance, language);
  const resultingBalance =
    walletBalance == null ? null : Math.max(0, walletBalance - linkCreditsCost);
  const resultingBalanceLabel =
    resultingBalance == null
      ? t('helper_dashboard.apply_balance_after_loading')
      : formatLinkCredits(resultingBalance, language);

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
      <div className="space-y-2 text-sm font-medium leading-relaxed text-slate-600">
        <p>{t('helper_dashboard.apply_confirm_type', { type: typeLabel })}</p>
        <p>{t('helper_dashboard.apply_confirm_debit', { cost: costLabel })}</p>
        <p>{t('helper_dashboard.apply_confirm_current_balance', { count: currentBalanceLabel })}</p>
        <p>{t('helper_dashboard.apply_confirm_resulting_balance', { count: resultingBalanceLabel })}</p>
      </div>
    </PremiumResponsiveModal>
  );
}
