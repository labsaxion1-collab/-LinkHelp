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
  t: (key: string, vars?: Record<string, string | number>) => string;
  emptyLabel: string;
};

export function ClientCreditHistoryList({ entries, limit = 20, t, emptyLabel }: Props) {
  const rows = entries.slice(0, limit);

  if (!rows.length) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-slate-500">
        <p className="text-sm font-bold">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((entry) => {
        const label = resolveClientCreditEntryLabel(entry, t);
        const amountText = `${formatSignedClientCreditAmount(entry.amount)} ${t('credits.lc_unit')}`;

        return (
          <div
            key={entry.id}
            className="grid w-full grid-cols-[1fr_auto] gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">{label}</p>
              <p className="text-xs font-medium text-slate-500">
                {new Date(entry.createdAt).toLocaleString()}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
                {t('client_credits.balance_after', { amount: entry.balanceAfter })}
              </p>
            </div>
            <div className="flex flex-col items-end justify-center gap-0.5">
              <p className={clsx('text-sm font-black tabular-nums', clientCreditAmountClass(entry.amount))}>
                {amountText}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
