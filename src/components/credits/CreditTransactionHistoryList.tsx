import { ChevronRight } from 'lucide-react';
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
  onSelect,
  t,
  emptyLabel,
  emptyHint,
  balanceAfterLabel,
}: Props) {
  const isDark = variant === 'dark';

  if (!transactions.length) {
    return (
      <div
        className={clsx(
          'flex flex-col items-center gap-3 rounded-2xl border border-dashed px-4 py-10 text-center',
          isDark ? 'border-white/10 text-slate-500' : 'border-slate-200 text-slate-500',
        )}
      >
        <p className="text-sm font-bold">{emptyLabel}</p>
        {emptyHint ? <p className="text-xs font-medium opacity-80">{emptyHint}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {transactions.slice(0, limit).map((tx) => {
        const unlock = findUnlockForTransaction(tx, unlocks);
        const amount = resolveCreditTransactionAmount(tx, unlock);
        const isExclusive =
          tx.type === 'APPLICATION_INTEREST' && isExclusiveInterestDescription(tx.description);
        const summaryKey = creditTransactionSummaryKey(tx, { isExclusive });
        const summaryText =
          summaryKey === 'credits_tx.type_unknown_with_desc'
            ? tx.description
            : t(summaryKey);

        const rowClass = clsx(
          'grid w-full grid-cols-[1fr_auto] gap-3 rounded-xl border px-4 py-3 text-left transition',
          isDark
            ? 'border-white/[0.05] bg-white/[0.03] hover:bg-white/[0.06]'
            : 'border-slate-100 bg-slate-50 hover:bg-slate-100',
          onSelect && 'cursor-pointer',
        );

        const content = (
          <>
            <div className="min-w-0">
              <p className={clsx('truncate text-sm font-bold', isDark ? 'text-slate-200' : 'text-slate-900')}>
                {summaryText}
              </p>
              <p className={clsx('text-xs font-medium', isDark ? 'text-slate-500' : 'text-slate-500')}>
                {new Date(tx.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-2 text-right">
              <div>
                <p className={clsx('text-sm font-black tabular-nums', creditTransactionAmountClass(amount))}>
                  {formatSignedCreditAmount(amount)} LC
                </p>
                <p className={clsx('text-[11px] font-bold', isDark ? 'text-slate-500' : 'text-slate-400')}>
                  {balanceAfterLabel(tx.balanceAfter)}
                </p>
              </div>
              {onSelect ? (
                <ChevronRight className={clsx('h-4 w-4 shrink-0', isDark ? 'text-slate-600' : 'text-slate-400')} />
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
