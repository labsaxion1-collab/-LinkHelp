export type AdminFinancialTimeRange = 'today' | '7d' | '30d' | 'all';

export type AdminDashboardFinancialSummary = {
  revenueCadCents: number;
  purchaseCount: number;
  lcSold: number;
  lcConsumed: number;
  lcRefunded: number;
  lcGranted: number;
  lcInCirculation: number;
  netCreditBurn: number;
  timeRange: AdminFinancialTimeRange;
};

function finiteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function nonNegative(value: unknown): number | null {
  const parsed = finiteNumber(value);
  return parsed != null && parsed >= 0 ? parsed : null;
}

function parseTimeRange(value: unknown): AdminFinancialTimeRange {
  if (value === 'today' || value === '7d' || value === '30d' || value === 'all') return value;
  return 'all';
}

export function parseAdminDashboardFinancialSummary(
  value: unknown,
  fallbackRange: AdminFinancialTimeRange = 'all',
): AdminDashboardFinancialSummary | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== 'object') return null;
  const raw = row as Record<string, unknown>;

  const revenueCadCents = nonNegative(raw.revenue_cad_cents);
  const purchaseCount = nonNegative(raw.purchase_count);
  const lcSold = nonNegative(raw.lc_sold);
  const lcConsumed = nonNegative(raw.lc_consumed);
  const lcRefunded = nonNegative(raw.lc_refunded);
  const lcGranted = nonNegative(raw.lc_granted);
  const lcInCirculation = nonNegative(raw.lc_in_circulation);
  const netCreditBurn = nonNegative(raw.net_credit_burn);

  if (
    [revenueCadCents, purchaseCount, lcSold, lcConsumed, lcRefunded, lcGranted, lcInCirculation, netCreditBurn].some(
      (entry) => entry == null,
    )
  ) {
    return null;
  }

  return {
    revenueCadCents: revenueCadCents!,
    purchaseCount: purchaseCount!,
    lcSold: lcSold!,
    lcConsumed: lcConsumed!,
    lcRefunded: lcRefunded!,
    lcGranted: lcGranted!,
    lcInCirculation: lcInCirculation!,
    netCreditBurn: netCreditBurn!,
    timeRange: parseTimeRange(raw.time_range ?? fallbackRange),
  };
}

export function formatCadFromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}
