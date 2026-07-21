export type BackofficeAuditLogRow = {
  id: string;
  admin_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  reason: string | null;
  correlation_id: string | null;
  created_at: string;
};

export type BackofficeAuditListResponse = {
  total: number;
  limit: number;
  offset: number;
  logs: BackofficeAuditLogRow[];
};

export function parseBackofficeAuditList(value: unknown): BackofficeAuditListResponse | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  return {
    total: Number(raw.total ?? 0),
    limit: Number(raw.limit ?? 50),
    offset: Number(raw.offset ?? 0),
    logs: Array.isArray(raw.logs) ? (raw.logs as BackofficeAuditLogRow[]) : [],
  };
}
