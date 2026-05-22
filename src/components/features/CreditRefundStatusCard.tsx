import { useLanguage } from '@/context/LanguageContext';
import { formatLinkCredits } from '@/utils/formatLinkCredits';
import { MOCK_REFUND_STATUS } from '@/config/creditsUsageConfig';

type Props = { className?: string };

export function CreditRefundStatusCard({ className = '' }: Props) {
  const { t, language } = useLanguage();
  const s = MOCK_REFUND_STATUS;

  return (
    <div className={`rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 ${className}`}>
      <p className="text-xs font-bold text-emerald-900">{t(s.labelKey)}</p>
      <p className="mt-1 text-sm font-black text-emerald-800">
        {t('credits_refund.lc_returned', { amount: formatLinkCredits(s.lcReturned, language) })}
      </p>
    </div>
  );
}
