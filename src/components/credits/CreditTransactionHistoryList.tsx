import { ArrowDownLeft, ArrowUpRight, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import type { CreditTransaction, OpportunityUnlock } from '@/types/credits';
import {
  creditTransactionAmountClass,
  creditTransactionSummaryKey,
  findUnlockForTransaction,
  formatSignedCreditAmount,
  isExclusiveInterestDescription,
  resolveCreditTransactionAmount,
} from '@/utils/creditTransactionDisplay';

type Props = {
  transactions: CreditTransaction[];
  unlocks: OpportunityUnlock[];
  limit?: number;
  variant?: 'dark' | 'light';
  /** Compact rows for full-history screen (`/credits/history`). */
  density?: 'default' | 'compact';
  onSelect?: (tx: CreditTransaction) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  emptyLabel: string;
  emptyHint?: string;
  balanceAfterLabel: (count: number) => string;
};

export function CreditTransactionHistoryList({
  transactions,
  unlocks,
  limit = 20,
  variant = 'dark',
  density = 'default',
  onSelect,
  t,
  emptyLabel,
  emptyHint,
  balanceAfterLabel,
}: Props) {
  const isDark = variant === 'dark';
  const compact = density === 'compact';

  if (!transactions.length) {
    return (
      <div
        className={clsx(
          'flex flex-col items-center gap-2 rounded-2xl border border-dashed text-center',
          compact ? 'px-3 py-8' : 'gap-3 px-4 py-10',
          isDark ? 'border-white/15 bg-[#0C1A2E]/80 text-slate-400' : 'border-slate-200 text-slate-500',
        )}
      >
        <p className="text-sm font-bold">{emptyLabel}</p>
        {emptyHint ? <p className="text-xs font-medium opacity-80">{emptyHint}</p> : null}
      </div>
    );
  }

  return (
    <div className={clsx(compact ? 'space-y-1.5' : 'space-y-2')}>
      {transactions.slice(0, limit).map((tx) => {
        const unlock = findUnlockForTransaction(tx, unlocks);
        const amount = resolveCreditTransactionAmount(tx, unlock);
        const inbound = amount > 0;
        const Icon = inbound ? ArrowDownLeft : ArrowUpRight;
        const isExclusive =
          tx.type === 'APPLICATION_INTEREST' && isExclusiveInterestDescription(tx.description);
        const summaryKey = creditTransactionSummaryKey(tx, { isExclusive });
        const summaryText =
          summaryKey === 'credits_tx.type_unknown_with_desc'
            ? tx.description
            : t(summaryKey);

        const rowClass = clsx(
          'grid w-full text-left transition',
          compact
            ? 'grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2 rounded-lg px-3 py-2.5'
            : 'grid-cols-[minmax(0,1fr)_auto] items-start gap-3 rounded-xl px-4 py-3',
          isDark
            ? compact
              ? 'border border-white/12 bg-[#0C1A2E] hover:border-blue-400/25 hover:bg-[#102038]'
              : 'border border-white/[0.05] bg-white/[0.03] hover:bg-white/[0.06]'
            : compact
              ? 'border border-slate-200/80 bg-white hover:bg-slate-50'
              : 'border border-slate-100 bg-slate-50 hover:bg-slate-100',
          onSelect && 'cursor-pointer',
        );

        const content = (
          <>
            {compact ? (
              <span
                className={clsx(
                  'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                  inbound
                    ? isDark
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-emerald-50 text-emerald-600'
                    : isDark
                      ? 'bg-rose-500/15 text-rose-400'
                      : 'bg-rose-50 text-rose-600',
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
              </span>
            ) : null}
            <div className="min-w-0">
              <p
                className={clsx(
                  'truncate whitespace-nowrap font-bold',
                  compact ? 'text-[13px] leading-snug' : 'text-sm',
                  isDark ? 'text-slate-200' : 'text-slate-900',
                )}
              >
                {summaryText}
              </p>
              <p
                className={clsx(
                  'truncate whitespace-nowrap font-medium',
                  compact ? 'mt-0.5 text-[11px] leading-snug' : 'text-xs',
                  isDark ? 'text-slate-500' : 'text-slate-500',
                )}
              >
                {new Date(tx.createdAt).toLocaleString()}
              </p>
              <p
                className={clsx(
                  'font-semibold',
                  compact ? 'mt-0.5 text-[10px] leading-snug' : 'text-[11px] font-bold',
                  isDark ? 'text-slate-500' : 'text-slate-400',
                )}
              >
                {balanceAfterLabel(tx.balanceAfter)}
              </p>
            </div>
            <div className="flex shrink-0 items-start gap-1 pl-1 text-right">
              <div>
                <p
                  className={clsx(
                    'whitespace-nowrap font-black tabular-nums',
                    compact ? 'text-[13px] leading-none' : 'text-sm',
                    creditTransactionAmountClass(amount),
                  )}
                >
                  {formatSignedCreditAmount(amount)} LC
                </p>
              </div>
              {onSelect ? (
                <ChevronRight
                  className={clsx(
                    'mt-0.5 shrink-0',
                    compact ? 'h-3.5 w-3.5' : 'h-4 w-4',
                    isDark ? 'text-slate-600' : 'text-slate-400',
                  )}
                />
              ) : null}
            </div>
          </>
        );

        if (onSelect) {
          return (
            <button key={tx.id} type="button" className={rowClass} onClick={() => onSelect(tx)}>
              {content}
            </button>
          );
        }

        return (
          <div key={tx.id} className={rowClass}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
