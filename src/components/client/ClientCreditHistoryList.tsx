import { ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import type { ClientCreditLedgerEntry } from '@/types/clientCredits';
import {
  clientCreditAmountClass,
  formatSignedClientCreditAmount,
  resolveClientCreditEntryLabel,
} from '@/utils/clientCreditMetrics';

type Props = {
  entries: ClientCreditLedgerEntry[];
  limit?: number;
  /** Compact rows for full-history screen (`?history=1`). */
  density?: 'default' | 'compact';
  t: (key: string, vars?: Record<string, string | number>) => string;
  emptyLabel: string;
  onSelect?: (entry: ClientCreditLedgerEntry) => void;
};

export function ClientCreditHistoryList({
  entries,
  limit = 20,
  density = 'default',
  t,
  emptyLabel,
  onSelect,
}: Props) {
  const rows = entries.slice(0, limit);
  const compact = density === 'compact';

  if (!rows.length) {
    return (
      <div
        className={clsx(
          'flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 text-center text-slate-500',
          compact ? 'px-3 py-8' : 'px-4 py-10',
        )}
      >
        <p className="text-sm font-bold">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className={clsx(compact ? 'space-y-1.5' : 'space-y-2')}>
      {rows.map((entry) => {
        const label = resolveClientCreditEntryLabel(entry, t);
        const amountText = `${formatSignedClientCreditAmount(entry.amount)} ${t('credits.lc_unit')}`;
        const clickable = Boolean(entry.requestId && onSelect);
        const rowClass = clsx(
          'grid w-full grid-cols-[minmax(0,1fr)_auto] gap-2 text-left transition',
          compact
            ? 'items-start rounded-lg border border-slate-200/80 bg-white px-3 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.04)]'
            : 'gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3',
          clickable &&
            (compact
              ? 'cursor-pointer hover:border-blue-200 hover:bg-blue-50/50'
              : 'cursor-pointer hover:border-blue-200 hover:bg-blue-50/60'),
        );

        const content = (
          <>
            <div className="min-w-0">
              <p
                className={clsx(
                  'truncate whitespace-nowrap font-bold text-slate-900',
                  compact ? 'text-[13px] leading-snug' : 'text-sm',
                )}
              >
                {label}
              </p>
              <p
                className={clsx(
                  'truncate whitespace-nowrap font-medium text-slate-500',
                  compact ? 'mt-0.5 text-[11px] leading-snug' : 'text-xs',
                )}
              >
                {new Date(entry.createdAt).toLocaleString()}
              </p>
              <p
                className={clsx(
                  'font-semibold text-slate-400',
                  compact ? 'mt-0.5 text-[10px] leading-snug' : 'mt-0.5 text-[11px]',
                )}
              >
                {t('client_credits.balance_after', { amount: entry.balanceAfter })}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end justify-center gap-0.5 pl-1">
              <p
                className={clsx(
                  'whitespace-nowrap font-black tabular-nums',
                  compact ? 'text-[13px] leading-none' : 'text-sm',
                  clientCreditAmountClass(entry.amount),
                )}
              >
                {amountText}
              </p>
              {clickable ? (
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" aria-hidden />
              ) : null}
            </div>
          </>
        );

        if (clickable) {
          return (
            <button
              key={entry.id}
              type="button"
              className={rowClass}
              onClick={() => onSelect?.(entry)}
            >
              {content}
            </button>
          );
        }

        return (
          <div key={entry.id} className={rowClass}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
