import type { ReactNode } from 'react';
import { ArrowDownLeft, ArrowUpRight, Wallet } from 'lucide-react';
import { clsx } from 'clsx';

type Props = {
  variant?: 'light' | 'dark';
  totalReceived: number;
  totalUsed: number;
  balance: number | null;
  loading?: boolean;
  lcUnit: string;
  labels: {
    received: string;
    used: string;
    balance: string;
  };
};

function Tile({
  variant,
  icon,
  label,
  value,
  tone,
}: {
  variant: 'light' | 'dark';
  icon: ReactNode;
  label: string;
  value: string;
  tone: 'in' | 'out' | 'neutral';
}) {
  const isDark = variant === 'dark';
  return (
    <div
      className={clsx(
        'min-w-0 rounded-xl px-2.5 py-2.5',
        isDark
          ? 'border border-white/[0.07] bg-white/[0.035]'
          : 'border border-slate-200/80 bg-white',
      )}
    >
      <div className="flex items-center gap-1.5">
        <span
          className={clsx(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
            tone === 'in' && (isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600'),
            tone === 'out' && (isDark ? 'bg-rose-500/15 text-rose-400' : 'bg-rose-50 text-rose-600'),
            tone === 'neutral' && (isDark ? 'bg-blue-500/15 text-blue-300' : 'bg-blue-50 text-blue-600'),
          )}
        >
          {icon}
        </span>
        <p
          className={clsx(
            'line-clamp-2 text-[10px] font-bold leading-tight',
            isDark ? 'text-slate-400' : 'text-slate-500',
          )}
        >
          {label}
        </p>
      </div>
      <p
        className={clsx(
          'mt-1.5 truncate text-sm font-black tabular-nums leading-none',
          tone === 'in' && (isDark ? 'text-emerald-400' : 'text-emerald-600'),
          tone === 'out' && (isDark ? 'text-rose-400' : 'text-rose-600'),
          tone === 'neutral' && (isDark ? 'text-white' : 'text-slate-950'),
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function LinkCreditsHistorySummary({
  variant = 'light',
  totalReceived,
  totalUsed,
  balance,
  loading = false,
  lcUnit,
  labels,
}: Props) {
  const fmt = (n: number) => `${n} ${lcUnit}`;
  const balanceLabel = loading || balance == null ? '…' : fmt(balance);

  return (
    <div className="grid grid-cols-3 gap-2">
      <Tile
        variant={variant}
        tone="in"
        icon={<ArrowDownLeft className="h-3.5 w-3.5" aria-hidden />}
        label={labels.received}
        value={loading ? '…' : fmt(totalReceived)}
      />
      <Tile
        variant={variant}
        tone="out"
        icon={<ArrowUpRight className="h-3.5 w-3.5" aria-hidden />}
        label={labels.used}
        value={loading ? '…' : fmt(totalUsed)}
      />
      <Tile
        variant={variant}
        tone="neutral"
        icon={<Wallet className="h-3.5 w-3.5" aria-hidden />}
        label={labels.balance}
        value={balanceLabel}
      />
    </div>
  );
}
