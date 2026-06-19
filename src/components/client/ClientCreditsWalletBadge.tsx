import { useNavigate } from 'react-router-dom';
import { coerceLegacyLinkCreditsDisplay } from '@/utils/formatLinkCredits';
import { ROUTES } from '@/utils/constants';
import { BRAND } from '@/utils/brandAssets';

type Props = {
  balance: number | null;
  loading?: boolean;
  t: (key: string, options?: Record<string, string | number>) => string;
};

export function ClientCreditsWalletBadge({ balance, loading = false, t }: Props) {
  const navigate = useNavigate();
  const unresolvedBalance = loading || balance == null;
  const displayAmount = unresolvedBalance ? 0 : coerceLegacyLinkCreditsDisplay(balance);

  return (
    <button
      type="button"
      onClick={() => navigate(ROUTES.clientCredits)}
      className="inline-flex min-h-[34px] max-w-[9.5rem] shrink-0 items-center gap-1.5 rounded-full border border-blue-200/80 bg-white/95 px-2.5 py-1 text-left text-[11px] font-bold text-slate-700 shadow-sm backdrop-blur-sm hover:border-blue-300 hover:bg-blue-50"
      aria-label={t('client_credits.your_credits')}
    >
      <img
        src={BRAND.linkCreditCoin}
        alt=""
        className="h-6 w-6 shrink-0 rounded-full object-cover"
        loading="lazy"
        decoding="async"
      />
      <span className="truncate text-[11px] font-black tabular-nums text-slate-950">
        {unresolvedBalance ? '...' : t('client_credits.balance', { amount: displayAmount })}
      </span>
    </button>
  );
}
