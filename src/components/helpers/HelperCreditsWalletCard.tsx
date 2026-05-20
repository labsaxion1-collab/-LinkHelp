import * as Icons from 'lucide-react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { ROUTES } from '@/utils/constants';

type Props = {
  balance: number;
  usedThisMonth: number;
  unlocksCount: number;
  loading?: boolean;
  compact?: boolean;
  t: (key: string, options?: Record<string, string | number>) => string;
  onBuyCredits: () => void;
};

export function HelperCreditsWalletCard({
  balance,
  usedThisMonth,
  unlocksCount,
  loading = false,
  compact = false,
  t,
  onBuyCredits,
}: Props) {
  const lowBalance = balance <= 5;

  if (compact) {
    return (
      <button
        type="button"
        onClick={onBuyCredits}
        className="mb-3 inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-blue-100 bg-white px-3 text-left text-sm font-bold text-slate-700 shadow-sm hover:border-blue-200 hover:bg-blue-50"
      >
        <Icons.Coins className="h-4 w-4 text-blue-600" />
        <span className="text-slate-500">{t('helper_dashboard.credits_label')}</span>
        <span className="text-lg font-black tabular-nums text-slate-950">{loading ? '...' : balance}</span>
        {lowBalance ? <span className="h-2 w-2 rounded-full bg-amber-400" /> : null}
      </button>
    );
  }

  return (
    <div
      className={clsx(
        'rounded-xl border border-blue-100/90 bg-gradient-to-br from-white via-blue-50/25 to-indigo-50/20 shadow-sm ring-1 ring-slate-100/70',
        'p-4',
      )}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={clsx(
            'flex shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm',
            'h-10 w-10',
          )}
        >
          <Icons.Coins className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-blue-600/90">
            {t('helper_dashboard.credits_wallet_title')}
          </p>
          <p
            className={clsx(
              'font-black tabular-nums text-slate-950 leading-none mt-1',
              'text-4xl',
            )}
          >
            {loading ? '…' : balance}
          </p>
          <p className="mt-1.5 text-[11px] font-medium leading-snug text-slate-600">
            {t('helper_dashboard.credits_wallet_sub')}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-slate-200/80 bg-white/90 px-2.5 py-2 text-center">
          <p className="text-base font-black tabular-nums text-slate-900">{loading ? '—' : usedThisMonth}</p>
          <p className="text-[10px] font-bold leading-tight text-slate-500">{t('helper_dashboard.credits_used_month')}</p>
        </div>
        <div className="rounded-lg border border-slate-200/80 bg-white/90 px-2.5 py-2 text-center">
          <p className="text-base font-black tabular-nums text-slate-900">{loading ? '—' : unlocksCount}</p>
          <p className="text-[10px] font-bold leading-tight text-slate-500">{t('helper_dashboard.unlocked_count')}</p>
        </div>
      </div>

      {lowBalance ? (
        <p className="mt-3 rounded-lg border border-amber-200/90 bg-amber-50 px-2.5 py-2 text-[11px] font-semibold leading-snug text-amber-950">
          {t('helper_dashboard.low_credit_alert')}
        </p>
      ) : null}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={onBuyCredits}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white transition-colors hover:bg-black"
        >
          <Icons.CreditCard className="h-4 w-4 shrink-0" />
          {t('helper_dashboard.buy_credits')}
        </button>
        <Link
          to={ROUTES.helperCredits}
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
        >
          {t('helper_dashboard.view_history')}
        </Link>
      </div>
    </div>
  );
}
