import { recordSupabaseOperation } from '@/lib/dev/supabaseMetrics';
import type { AdminDashboardSummary } from '../adminDashboardContract';

type InflightEntry = {
  promise: Promise<AdminDashboardSummary>;
  controller: AbortController;
  subscribers: number;
};

const inflight = new Map<string, InflightEntry>();
const cache = new Map<string, { data: AdminDashboardSummary; expiresAt: number }>();
const CACHE_MS = 15_000;

export class AdminApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'AdminApiError';
  }
}

function metric(operationName: string, startedAt: number, data: unknown, error?: unknown) {
  recordSupabaseOperation(
    { operationName, domain: 'admin', table: 'dashboard-summary', action: 'api', sourceLabel: 'admin-dashboard' },
    { startedAt, data, error, rowCount: 1 },
  );
}

async function fetchSummary(token: string, signal: AbortSignal): Promise<AdminDashboardSummary> {
  const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
  try {
    const response = await fetch('/api/admin/dashboard-summary', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      signal,
    });
    if (!response.ok) throw new AdminApiError(response.status, response.status === 401 ? 'ADMIN_SESSION_EXPIRED' : response.status === 403 ? 'ADMIN_FORBIDDEN' : 'ADMIN_SUMMARY_UNAVAILABLE');
    const data = await response.json() as AdminDashboardSummary;
    metric('admin-dashboard-summary', startedAt, data);
    return data;
  } catch (error) {
    metric('admin-dashboard-summary', startedAt, { status: error instanceof AdminApiError ? error.status : 0 }, error);
    throw error;
  }
}

export function subscribeAdminDashboardSummary(input: { userId: string; accessToken: string; force?: boolean }): {
  promise: Promise<AdminDashboardSummary>;
  release: () => void;
} {
  const key = `dashboard-summary:${input.userId}`;
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
  entry.promise = fetchSummary(input.accessToken, controller.signal)
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
  cache.delete(`dashboard-summary:${userId}`);
}

export function resetAdminDashboardApiForTests(): void {
  for (const entry of inflight.values()) entry.controller.abort();
  inflight.clear();
  cache.clear();
}
