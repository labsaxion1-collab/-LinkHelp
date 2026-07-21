export type BackofficeCreditTransactionRow = {
  id: string;
  helper_id: string;
  helper_name: string | null;
  type: string;
  amount: number;
  balance_after: number;
  request_id: string | null;
  application_id: string | null;
  description: string;
  created_at: string;
};

export type BackofficeCreditListResponse = {
  total: number;
  limit: number;
  offset: number;
  transactions: BackofficeCreditTransactionRow[];
};

export function parseBackofficeCreditList(value: unknown): BackofficeCreditListResponse | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  return {
    total: Number(raw.total ?? 0),
    limit: Number(raw.limit ?? 50),
    offset: Number(raw.offset ?? 0),
    transactions: Array.isArray(raw.transactions)
      ? (raw.transactions as BackofficeCreditTransactionRow[])
      : [],
  };
}
