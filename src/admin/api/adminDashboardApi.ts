import { recordSupabaseOperation } from '@/lib/dev/supabaseMetrics';
import type { AdminDashboardPayload } from '../adminDashboardContract';
import {
  isAdminDashboardApiErrorCode,
  type AdminDashboardApiErrorCode,
} from '../adminDashboardErrors';
import type { AdminFinancialTimeRange } from '../adminDashboardFinancialContract';

type InflightEntry = {
  promise: Promise<AdminDashboardPayload>;
  controller: AbortController;
  subscribers: number;
};

const inflight = new Map<string, InflightEntry>();
const cache = new Map<string, { data: AdminDashboardPayload; expiresAt: number }>();
const CACHE_MS = 15_000;

export class AdminApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: AdminDashboardApiErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'AdminApiError';
  }
}

function metric(operationName: string, startedAt: number, data: unknown, error?: unknown) {
  recordSupabaseOperation(
    { operationName, domain: 'admin', table: 'dashboard-summary', action: 'api', sourceLabel: 'admin-dashboard' },
    { startedAt, data, error, rowCount: 1 },
  );
}

async function parseErrorBody(response: Response): Promise<AdminDashboardApiErrorCode> {
  try {
    const body = (await response.json()) as { error?: unknown };
    if (isAdminDashboardApiErrorCode(body.error)) return body.error;
  } catch {
    // ignore non-json error bodies (e.g. HTML 404 from Vite dev)
  }
  if (response.status === 401) return 'ADMIN_SESSION_EXPIRED';
  if (response.status === 403) return 'ADMIN_FORBIDDEN';
  if (response.status === 503) return 'SUPABASE_SERVER_NOT_CONFIGURED';
  if (response.status === 404) return 'ADMIN_SUMMARY_NETWORK';
  return 'ADMIN_SUMMARY_UNAVAILABLE';
}

async function fetchSummary(
  token: string,
  timeRange: AdminFinancialTimeRange,
  signal: AbortSignal,
): Promise<AdminDashboardPayload> {
  const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const url = `/api/admin/dashboard-summary?range=${encodeURIComponent(timeRange)}`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      signal,
    });
    if (!response.ok) {
      const code = await parseErrorBody(response);
      throw new AdminApiError(response.status, code);
    }
    const data = (await response.json()) as AdminDashboardPayload;
    if (!data?.summary) throw new AdminApiError(502, 'ADMIN_SUMMARY_INVALID');
    metric('admin-dashboard-summary', startedAt, data);
    return data;
  } catch (error) {
    if (error instanceof AdminApiError) {
      metric('admin-dashboard-summary', startedAt, { status: error.status, code: error.code }, error);
      throw error;
    }
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    metric('admin-dashboard-summary', startedAt, { status: 0 }, error);
    throw new AdminApiError(0, 'ADMIN_SUMMARY_NETWORK');
  }
}

export function subscribeAdminDashboardSummary(input: {
  userId: string;
  accessToken: string;
  force?: boolean;
  timeRange?: AdminFinancialTimeRange;
}): {
  promise: Promise<AdminDashboardPayload>;
  release: () => void;
} {
  const timeRange = input.timeRange ?? 'all';
  const key = `dashboard-summary:${input.userId}:${timeRange}`;
  const cached = cache.get(key);
  if (!input.force && cached && cached.expiresAt > Date.now()) {
    const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    metric('admin-dashboard-summary-cache-hit', startedAt, cached.data);
    return { promise: Promise.resolve(cached.data), release: () => {} };
  }

  const existing = inflight.get(key);
  if (existing) {
    existing.subscribers += 1;
    const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    metric('admin-dashboard-summary-deduplicated', startedAt, { cacheHit: false, deduplicated: true });
    return { promise: existing.promise, release: releaseFor(key, existing) };
  }

  const controller = new AbortController();
  const entry: InflightEntry = {
    controller,
    subscribers: 1,
    promise: Promise.resolve(null as never),
  };
  entry.promise = fetchSummary(input.accessToken, timeRange, controller.signal)
    .then((data) => {
      cache.set(key, { data, expiresAt: Date.now() + CACHE_MS });
      return data;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, entry);
  return { promise: entry.promise, release: releaseFor(key, entry) };
}

function releaseFor(key: string, entry: InflightEntry): () => void {
  let released = false;
  return () => {
    if (released) return;
    released = true;
    entry.subscribers -= 1;
    if (entry.subscribers <= 0 && inflight.get(key) === entry) {
      entry.controller.abort();
      inflight.delete(key);
    }
  };
}

export function clearAdminDashboardCache(userId?: string): void {
  if (!userId) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(`dashboard-summary:${userId}:`)) cache.delete(key);
  }
}

export function resetAdminDashboardApiForTests(): void {
  for (const entry of inflight.values()) entry.controller.abort();
  inflight.clear();
  cache.clear();
}
