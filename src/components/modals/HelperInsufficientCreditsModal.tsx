import * as Icons from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PremiumResponsiveModal } from '@/components/design-system/PremiumResponsiveModal';
import { ROUTES } from '@/utils/constants';
import { formatLinkCredits } from '@/utils/formatLinkCredits';

type Props = {
  open: boolean;
  requiredLc: number;
  currentBalance: number | null;
  onClose: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  language: string;
};

export function HelperInsufficientCreditsModal({
  open,
  requiredLc,
  currentBalance,
  onClose,
  t,
  language,
}: Props) {
  const navigate = useNavigate();
  const balanceLabel =
    currentBalance != null ? formatLinkCredits(currentBalance, language as 'pt' | 'en' | 'fr') : '—';
  const requiredLabel = formatLinkCredits(requiredLc, language as 'pt' | 'en' | 'fr');

  return (
    <PremiumResponsiveModal
      open={open}
      onClose={onClose}
      title={t('helper_credits.insufficient_title')}
      footer={
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate(ROUTES.helperLinkCredits);
            }}
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-black text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700"
          >
            <Icons.Coins className="h-4 w-4 shrink-0" />
            {t('helper_credits.insufficient_buy_linkcredits')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            {t('helper_credits.insufficient_back')}
          </button>
        </div>
      }
    >
      <p className="text-sm leading-relaxed text-slate-600">
        {t('helper_credits.insufficient_interest_body', { required: requiredLabel })}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            {t('helper_credits.insufficient_balance_label')}
          </p>
          <p className="mt-1 text-lg font-black tabular-nums text-slate-900">{balanceLabel}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-amber-800/80">
            {t('helper_credits.insufficient_required_label')}
          </p>
          <p className="mt-1 text-lg font-black tabular-nums text-amber-900">{requiredLabel}</p>
        </div>
      </div>
    </PremiumResponsiveModal>
  );
}
