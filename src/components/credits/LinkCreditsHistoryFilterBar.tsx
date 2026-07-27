import { clsx } from 'clsx';
import type { LinkCreditsHistoryFilter } from '@/utils/linkCreditsHistoryTotals';

type Props = {
  variant?: 'light' | 'dark';
  filter: LinkCreditsHistoryFilter;
  onChange: (next: LinkCreditsHistoryFilter) => void;
  labels: {
    all: string;
    inbound: string;
    outbound: string;
  };
};

const OPTIONS: LinkCreditsHistoryFilter[] = ['all', 'in', 'out'];

export function LinkCreditsHistoryFilterBar({
  variant = 'light',
  filter,
  onChange,
  labels,
}: Props) {
  const isDark = variant === 'dark';
  const labelFor = (key: LinkCreditsHistoryFilter) =>
    key === 'all' ? labels.all : key === 'in' ? labels.inbound : labels.outbound;

  return (
    <div
      className={clsx(
        'flex w-full gap-1.5 rounded-xl p-1',
        isDark ? 'bg-white/[0.04] ring-1 ring-white/[0.06]' : 'bg-slate-100/90 ring-1 ring-slate-200/80',
      )}
      role="tablist"
      aria-label="Filter"
    >
      {OPTIONS.map((key) => {
        const active = filter === key;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(key)}
            className={clsx(
              'min-h-9 min-w-0 flex-1 rounded-lg px-2 text-[12px] font-bold leading-tight transition',
              active
                ? isDark
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'bg-white text-slate-900 shadow-sm'
                : isDark
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-500 hover:text-slate-800',
            )}
          >
            <span className="block truncate whitespace-nowrap">{labelFor(key)}</span>
          </button>
        );
      })}
    </div>
  );
}
