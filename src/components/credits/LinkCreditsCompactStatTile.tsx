import type { ElementType } from 'react';
import { clsx } from 'clsx';

type Props = {
  icon: ElementType;
  label: string;
  value?: string;
  sub?: string;
  iconColor: string;
  iconBg: string;
  variant?: 'light' | 'dark';
};

/** Compact financial stat tile — display only. */
export function LinkCreditsCompactStatTile({
  icon: Icon,
  label,
  value,
  sub,
  iconColor,
  iconBg,
  variant = 'light',
}: Props) {
  const isDark = variant === 'dark';
  return (
    <div
      className={clsx(
        'lh-credits-fade-in flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-center',
        isDark
          ? 'border-white/[0.06] bg-white/[0.04]'
          : 'border-white/80 bg-white/85 shadow-[0_4px_14px_rgba(15,23,42,0.04)]',
      )}
    >
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
        <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
      </span>
      <p
        className={clsx(
          'text-[9px] font-bold leading-tight',
          isDark ? 'text-slate-400' : 'text-slate-500',
        )}
      >
        {label}
      </p>
      {value !== undefined ? (
        <p
          className={clsx(
            'text-sm font-black tabular-nums',
            isDark ? 'text-white' : 'text-slate-950',
          )}
        >
          {value}
        </p>
      ) : null}
      {sub ? (
        <p
          className={clsx(
            'text-[9px] font-medium leading-tight',
            isDark ? 'text-slate-500' : 'text-slate-400',
          )}
        >
          {sub}
        </p>
      ) : null}
    </div>
  );
}
