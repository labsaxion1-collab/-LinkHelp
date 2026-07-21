export type BackofficeRequestListItem = {
  id: string;
  title: string;
  category: string;
  status: string;
  budget: string | null;
  location: string | null;
  client_id: string;
  client_name: string | null;
  created_at: string;
  application_count: number;
};

export type BackofficeRequestListResponse = {
  total: number;
  limit: number;
  offset: number;
  requests: BackofficeRequestListItem[];
};

export function parseBackofficeRequestList(value: unknown): BackofficeRequestListResponse | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  return {
    total: Number(raw.total ?? 0),
    limit: Number(raw.limit ?? 50),
    offset: Number(raw.offset ?? 0),
    requests: Array.isArray(raw.requests) ? (raw.requests as BackofficeRequestListItem[]) : [],
  };
}

export function parseBackofficeRequestDetail(value: unknown): {
  request: Record<string, unknown>;
  client: Record<string, unknown> | null;
  applications: unknown[];
} | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  if (!raw.request || typeof raw.request !== 'object') return null;
  return {
    request: raw.request as Record<string, unknown>,
    client: (raw.client as Record<string, unknown> | null) ?? null,
    applications: Array.isArray(raw.applications) ? raw.applications : [],
  };
}
