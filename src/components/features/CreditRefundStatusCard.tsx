import * as Icons from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { formatLinkCredits } from '@/utils/formatLinkCredits';
import { MOCK_REFUND_STATUS } from '@/config/creditsUsageConfig';

type Props = { className?: string };

export function CreditRefundStatusCard({ className = '' }: Props) {
  const { t, language } = useLanguage();
  const s = MOCK_REFUND_STATUS;

  return (
    <div
      className={`flex items-center gap-4 rounded-2xl border border-emerald-700/30 bg-emerald-950/30 px-5 py-4 ${className}`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
        <Icons.RefreshCw className="h-5 w-5 text-emerald-400" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-bold text-emerald-400">{t(s.labelKey)}</p>
        <p className="mt-0.5 text-sm font-black text-emerald-200">
          {t('credits_refund.lc_returned', { amount: formatLinkCredits(s.lcReturned, language) })}
        </p>
      </div>
      <Icons.ChevronRight className="ml-auto h-4 w-4 shrink-0 text-emerald-600" />
    </div>
  );
}
