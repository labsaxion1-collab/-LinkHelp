export type LinkCreditsHistoryFilter = 'all' | 'in' | 'out';

export type LinkCreditsHistoryTotals = {
  totalReceived: number;
  totalUsed: number;
};

/** Sum positive/negative amounts from already-loaded movements (frontend only). */
export function computeLinkCreditsHistoryTotals(
  amounts: ReadonlyArray<number>,
): LinkCreditsHistoryTotals {
  let totalReceived = 0;
  let totalUsed = 0;
  for (const amount of amounts) {
    if (amount > 0) totalReceived += amount;
    else if (amount < 0) totalUsed += Math.abs(amount);
  }
  return { totalReceived, totalUsed };
}

export function filterLinkCreditsHistoryAmounts<T>(
  items: ReadonlyArray<T>,
  filter: LinkCreditsHistoryFilter,
  getAmount: (item: T) => number,
): T[] {
  if (filter === 'all') return [...items];
  if (filter === 'in') return items.filter((item) => getAmount(item) > 0);
  return items.filter((item) => getAmount(item) < 0);
}
