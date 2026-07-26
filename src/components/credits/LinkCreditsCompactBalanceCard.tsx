import type { ReactNode } from 'react';
import * as Icons from 'lucide-react';
import { clsx } from 'clsx';
import { useAnimatedLinkCreditBalance } from '@/hooks/useAnimatedLinkCreditBalance';

type Variant = 'light' | 'dark';

type Props = {
  variant?: Variant;
  title: string;
  balance: number | null;
  loading?: boolean;
  lcUnit: string;
  buyLabel: string;
  historyLabel: string;
  onBuy: () => void;
  onHistory: () => void;
  buyDisabled?: boolean;
  coin?: ReactNode;
};

/**
 * Compact LinkCredits balance header — visual only; does not own purchase logic.
 */
export function LinkCreditsCompactBalanceCard({
  variant = 'light',
  title,
  balance,
  loading = false,
  lcUnit,
  buyLabel,
  historyLabel,
  onBuy,
  onHistory,
  buyDisabled = false,
  coin,
}: Props) {
  const isDark = variant === 'dark';
  const display = useAnimatedLinkCreditBalance(balance, loading);

  return (
    <section
      className={clsx(
        'lh-credits-fade-in rounded-2xl border p-3.5 shadow-sm sm:p-4',
        isDark
          ? 'border-white/[0.08] bg-gradient-to-br from-[#0A1628] via-[#071020] to-[#04091A]'
          : 'border-white/80 bg-white/90 backdrop-blur-sm',
      )}
      data-lh-credits-balance-card
    >
      <p
        className={clsx(
          'text-[10px] font-black uppercase tracking-[0.2em]',
          isDark ? 'text-slate-400' : 'text-slate-500',
        )}
      >
        {title}
      </p>

      <div className="mt-2.5 flex items-center gap-3">
        <span
          className={clsx(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
            isDark ? 'bg-blue-500/15 text-blue-300' : 'bg-amber-50 text-[#D9A928]',
          )}
          aria-hidden
        >
          {coin ?? <Icons.Coins className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p
            className={clsx(
              'truncate text-3xl font-black tabular-nums leading-none tracking-tight sm:text-[2rem]',
              isDark ? 'text-white' : 'text-slate-950',
            )}
          >
            {display}
            <span
              className={clsx(
                'ml-1.5 text-base font-black',
                isDark ? 'text-blue-300' : 'text-slate-500',
              )}
            >
              {lcUnit}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-3.5 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={onBuy}
          disabled={buyDisabled}
          className={clsx(
            'inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-3 text-sm font-black transition active:scale-[0.98] disabled:opacity-60 motion-reduce:active:scale-100',
            isDark
              ? 'bg-blue-500 text-white shadow-[0_4px_16px_rgba(59,130,246,0.35)] hover:bg-blue-400'
              : 'bg-gradient-to-r from-[#071238] to-[#02102D] text-white shadow-[0_8px_18px_rgba(7,18,56,0.18)] hover:opacity-95',
          )}
        >
          <Icons.ShoppingCart className="h-4 w-4 shrink-0" />
          <span className="whitespace-nowrap">{buyLabel}</span>
        </button>
        <button
          type="button"
          onClick={onHistory}
          className={clsx(
            'inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold transition active:scale-[0.98] motion-reduce:active:scale-100',
            isDark
              ? 'border-white/10 bg-white/[0.05] text-white hover:bg-white/[0.08]'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
          )}
        >
          <Icons.History className="h-4 w-4 shrink-0" />
          <span className="whitespace-nowrap">{historyLabel}</span>
        </button>
      </div>
    </section>
  );
}
