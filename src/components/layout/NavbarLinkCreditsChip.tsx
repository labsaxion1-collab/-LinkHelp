import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useAppMode } from '@/context/AppModeContext';
import { useWalletBalance } from '@/hooks/useWalletBalance';
import { BRAND } from '@/utils/brandAssets';
import { formatCompactNavbarLinkCredits } from '@/utils/formatLinkCredits';
import { ROUTES } from '@/utils/constants';
import { UI_VISIBILITY } from '@/config/uiVisibility';
import { clsx } from 'clsx';

type Props = {
  compact?: boolean;
  className?: string;
};

/**
 * Shared navbar chip: official coin + balance + LC.
 * Helper → credit_wallets via useWalletBalance / CreditContext.
 * Client → profiles.credits (same source as Profile → LinkCredits / home summary).
 */
export function NavbarLinkCreditsChip({ compact = false, className }: Props) {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { profile, authLoading } = useAuth();
  const { isHelperMode } = useAppMode();
  const { balance: helperBalance, loading: helperLoading } = useWalletBalance();

  const isHelper = isHelperMode;
  if (isHelper && !UI_VISIBILITY.helperCredits) return null;
  if (!isHelper && !UI_VISIBILITY.clientCredits) return null;

  const balance = isHelper
    ? helperBalance
    : typeof profile?.credits === 'number'
      ? profile.credits
      : null;
  const loading = isHelper ? helperLoading : authLoading && balance == null;

  const unresolved = loading || balance == null;
  const errored = !loading && balance == null;
  const formatted =
    !unresolved && balance != null
      ? formatCompactNavbarLinkCredits(balance, language)
      : null;

  const ariaLabel = unresolved
    ? t('credits.navbar_balance_loading_aria')
    : errored
      ? t('credits.navbar_balance_error_aria')
      : t('credits.navbar_balance_aria', { amount: formatted!.fullAmount });

  return (
    <button
      type="button"
      onClick={() => navigate(`${ROUTES.profile}#profile-linkcredits`)}
      className={clsx(
        'inline-flex shrink-0 items-center gap-1 rounded-full border border-white/15 bg-white/10 text-left text-white/95 backdrop-blur-sm transition hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
        compact ? 'min-h-[32px] max-w-[7.25rem] gap-0.5 px-1.5 py-0.5' : 'min-h-[34px] max-w-[8.5rem] px-2 py-1',
        className,
      )}
      aria-label={ariaLabel}
      title={ariaLabel}
      data-testid="navbar-linkcredits"
      data-role={isHelper ? 'helper' : 'client'}
      data-loading={unresolved ? 'true' : 'false'}
    >
      <img
        src={BRAND.linkCreditCoin}
        alt=""
        className={clsx('shrink-0 rounded-full object-cover', compact ? 'h-4 w-4' : 'h-5 w-5')}
        loading="eager"
        decoding="async"
      />
      {unresolved ? (
        <span
          className={clsx(
            'inline-block animate-pulse rounded bg-white/25',
            compact ? 'h-2.5 w-8' : 'h-3 w-10',
          )}
          aria-hidden
          data-testid="navbar-linkcredits-skeleton"
        />
      ) : errored ? (
        <span className="text-[10px] font-bold tabular-nums text-white/70">— LC</span>
      ) : (
        <span
          className={clsx(
            'truncate font-black tabular-nums leading-none text-white',
            compact ? 'text-[10px]' : 'text-[11px]',
          )}
          data-testid="navbar-linkcredits-value"
        >
          {formatted!.shortLabel}
        </span>
      )}
    </button>
  );
}

/** @deprecated Prefer NavbarLinkCreditsChip — kept as alias for older imports. */
export const HelperNavbarLinkCreditsChip = NavbarLinkCreditsChip;
