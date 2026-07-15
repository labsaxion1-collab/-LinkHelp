export type SupabaseMetricAction = 'select' | 'insert' | 'update' | 'upsert' | 'delete' | 'rpc' | 'api' | 'refresh';

export type SupabaseOperationMeta = {
  operationName: string;
  domain: string;
  table: string;
  action: SupabaseMetricAction;
  sourceLabel: string;
  refreshCycleId?: string | null;
};

export type SupabaseOperationMetric = SupabaseOperationMeta & {
  startedAt: number;
  durationMs: number;
  rowCount: number | null;
  approximateBytes: number | null;
  success: boolean;
  errorCode: string | null;
  timestamp: string;
};

type RealtimeEventKey = `${string}:${string}`;

export type RealtimeChannelMetric = {
  channelName: string;
  tables: string[];
  filters: string[];
  listenerCount: number;
  creations: number;
  removals: number;
  createdAt: number;
  removedAt: number | null;
  active: boolean;
  statuses: string[];
  events: Partial<Record<RealtimeEventKey, number>>;
};

export type SupabaseMetricsSnapshot = {
  operations: SupabaseOperationMetric[];
  channels: RealtimeChannelMetric[];
  activeChannelCount: number;
};

type OperationSummary = {
  operation: string;
  table: string;
  calls: number;
  rows: number;
  approximateBytes: number;
  durationMs: number;
};

type ChannelSummary = {
  channel: string;
  creations: number;
  removals: number;
  events: number;
  active: boolean;
};

type MetricsSummary = { operations: OperationSummary[]; channels: ChannelSummary[] };

const ENABLED = import.meta.env.DEV || import.meta.env.MODE === 'test';
const operations: SupabaseOperationMetric[] = [];
const channels = new Map<string, RealtimeChannelMetric>();
const recentCalls = new Map<string, number>();
let refreshSequence = 0;

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function safeErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const candidate = error as { code?: unknown; status?: unknown };
  if (typeof candidate.code === 'string') return candidate.code.slice(0, 64);
  if (typeof candidate.status === 'number') return `HTTP_${candidate.status}`;
  return 'UNKNOWN_ERROR';
}

export function estimateApproximateBytes(value: unknown): number | null {
  if (!ENABLED || value === undefined) return null;
  try {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) return null;
    return new TextEncoder().encode(serialized).length;
  } catch {
    return null;
  }
}

function rowCountOf(value: unknown): number | null {
  if (Array.isArray(value)) return value.length;
  return value == null ? 0 : 1;
}

export function createRefreshCycleId(source: string): string | null {
  if (!ENABLED) return null;
  refreshSequence += 1;
  return `${source}:${refreshSequence}`;
}

export function recordSupabaseOperation(
  meta: SupabaseOperationMeta,
  input: { startedAt: number; data?: unknown; error?: unknown; rowCount?: number | null },
): void {
  if (!ENABLED) return;
  const timestamp = Date.now();
  const key = `${meta.sourceLabel}:${meta.operationName}:${meta.table}:${meta.action}`;
  const previous = recentCalls.get(key);
  recentCalls.set(key, timestamp);
  if (previous != null && timestamp - previous < 150) {
    console.warn('[Supabase metrics] repeated operation within 150ms', key);
  }
  operations.push({
    ...meta,
    refreshCycleId: meta.refreshCycleId ?? null,
    startedAt: input.startedAt,
    durationMs: Math.max(0, now() - input.startedAt),
    rowCount: input.rowCount ?? rowCountOf(input.data),
    approximateBytes: estimateApproximateBytes(input.data),
    success: !input.error,
    errorCode: safeErrorCode(input.error),
    timestamp: new Date(timestamp).toISOString(),
  });
}

export async function measureSupabaseOperation<T extends { data?: unknown; error?: unknown }>(
  meta: SupabaseOperationMeta,
  operation: () => PromiseLike<T>,
): Promise<T> {
  if (!ENABLED) return await operation();
  const startedAt = now();
  try {
    const result = await operation();
    recordSupabaseOperation(meta, { startedAt, data: result.data, error: result.error });
    return result;
  } catch (error) {
    recordSupabaseOperation(meta, { startedAt, error });
    throw error;
  }
}

export async function measureLocalOperation<T>(
  meta: SupabaseOperationMeta,
  operation: () => Promise<T>,
  summarize: (value: T) => { data?: unknown; rowCount?: number | null } = (value) => ({ data: value }),
): Promise<T> {
  if (!ENABLED) return operation();
  const startedAt = now();
  try {
    const value = await operation();
    const summary = summarize(value);
    recordSupabaseOperation(meta, { startedAt, ...summary });
    return value;
  } catch (error) {
    recordSupabaseOperation(meta, { startedAt, error });
    throw error;
  }
}

export function recordRealtimeChannelCreated(input: {
  channelName: string;
  tables: string[];
  filters?: string[];
  listenerCount: number;
}): void {
  if (!ENABLED) return;
  const existing = channels.get(input.channelName);
  if (existing?.active) console.warn('[Supabase metrics] duplicate active channel', input.channelName);
  channels.set(input.channelName, {
    channelName: input.channelName,
    tables: [...input.tables],
    filters: [...(input.filters ?? [])],
    listenerCount: input.listenerCount,
    creations: (existing?.creations ?? 0) + 1,
    removals: existing?.removals ?? 0,
    createdAt: Date.now(),
    removedAt: null,
    active: true,
    statuses: existing?.statuses ?? [],
    events: existing?.events ?? {},
  });
}

export function recordRealtimeSubscriptionStatus(channelName: string, status: string): void {
  if (!ENABLED) return;
  const channel = channels.get(channelName);
  if (channel) channel.statuses.push(status.slice(0, 64));
}

export function recordRealtimeEvent(channelName: string, table: string, eventType: string): void {
  if (!ENABLED) return;
  const channel = channels.get(channelName);
  if (!channel) return;
  const key: RealtimeEventKey = `${table}:${eventType}`;
  channel.events[key] = (channel.events[key] ?? 0) + 1;
}

export function recordRealtimeChannelRemoved(channelName: string): void {
  if (!ENABLED) return;
  const channel = channels.get(channelName);
  if (!channel) return;
  channel.removals += 1;
  channel.removedAt = Date.now();
  channel.active = false;
}

export function getSupabaseMetricsSnapshot(): SupabaseMetricsSnapshot {
  return {
    operations: operations.map((metric) => ({ ...metric })),
    channels: [...channels.values()].map((channel) => ({
      ...channel,
      tables: [...channel.tables],
      filters: [...channel.filters],
      statuses: [...channel.statuses],
      events: { ...channel.events },
    })),
    activeChannelCount: [...channels.values()].filter((channel) => channel.active).length,
  };
}

export function resetSupabaseMetrics(): void {
  operations.length = 0;
  channels.clear();
  recentCalls.clear();
  refreshSequence = 0;
}

export function getSupabaseMetricsSummary(): MetricsSummary {
  const operationGroups = new Map<string, OperationSummary>();
  for (const metric of operations) {
    const key = `${metric.operationName}:${metric.table}`;
    const group = operationGroups.get(key) ?? {
      operation: metric.operationName,
      table: metric.table,
      calls: 0,
      rows: 0,
      approximateBytes: 0,
      durationMs: 0,
    };
    group.calls += 1;
    group.rows += metric.rowCount ?? 0;
    group.approximateBytes += metric.approximateBytes ?? 0;
    group.durationMs += metric.durationMs;
    operationGroups.set(key, group);
  }
  return {
    operations: [...operationGroups.values()],
    channels: [...channels.values()].map((channel) => ({
      channel: channel.channelName,
      creations: channel.creations,
      removals: channel.removals,
      events: Object.values(channel.events).reduce((sum, count) => sum + (count ?? 0), 0),
      active: channel.active,
    })),
  };
}

export function printSupabaseMetricsSummary(): MetricsSummary {
  const summary = getSupabaseMetricsSummary();
  if (ENABLED) {
    console.table(summary.operations);
    console.table(summary.channels);
  }
  return summary;
}


let activeRefreshCycleId: string | null = null;

export function setActiveRefreshCycle(refreshCycleId: string | null): void {
  if (!ENABLED) return;
  activeRefreshCycleId = refreshCycleId;
}

export function getActiveRefreshCycle(): string | null {
  return ENABLED ? activeRefreshCycleId : null;
}

function parseSupabaseRequest(url: string, method: string): SupabaseOperationMeta {
  let table = 'unknown';
  let action: SupabaseMetricAction = method === 'GET' ? 'select' : method === 'DELETE' ? 'delete' : method === 'PATCH' ? 'update' : 'insert';
  try {
    const parsed = new URL(url);
    const restMatch = parsed.pathname.match(/\/rest\/v1\/([^/]+)/);
    const rpcMatch = parsed.pathname.match(/\/rest\/v1\/rpc\/([^/]+)/);
    if (rpcMatch) {
      table = rpcMatch[1];
      action = 'rpc';
    } else if (restMatch) {
      table = restMatch[1];
    } else if (parsed.pathname.includes('/auth/')) {
      table = 'auth';
      action = 'api';
    } else if (parsed.pathname.includes('/storage/')) {
      table = 'storage';
      action = 'api';
    }
  } catch {
    table = 'invalid-url';
  }
  return {
    operationName: activeRefreshCycleId ? 'refresh-query' : 'supabase-request',
    domain: table === 'auth' ? 'auth' : table === 'storage' ? 'storage' : 'supabase',
    table,
    action,
    sourceLabel: activeRefreshCycleId ? 'AppDataContext.refreshRemote' : 'supabase-client',
    refreshCycleId: activeRefreshCycleId,
  };
}

export async function instrumentedSupabaseFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const fetchImpl = globalThis.fetch;
  if (!ENABLED) return fetchImpl(input, init);
  const request = input instanceof Request ? input : null;
  const url = request?.url ?? String(input);
  const method = (init?.method ?? request?.method ?? 'GET').toUpperCase();
  const meta = parseSupabaseRequest(url, method);
  const startedAt = now();
  try {
    const response = await fetchImpl(input, init);
    let data: unknown;
    try {
      const contentType = response.headers.get('content-type') ?? '';
      data = contentType.includes('application/json') ? await response.clone().json() : undefined;
    } catch {
      data = undefined;
    }
    recordSupabaseOperation(meta, {
      startedAt,
      data,
      error: response.ok ? undefined : { status: response.status },
    });
    return response;
  } catch (error) {
    recordSupabaseOperation(meta, { startedAt, error });
    throw error;
  }
}
declare global {
  interface Window {
    __LINKHELP_SUPABASE_METRICS__?: {
      snapshot: typeof getSupabaseMetricsSnapshot;
      reset: typeof resetSupabaseMetrics;
      summary: typeof getSupabaseMetricsSummary;
      print: typeof printSupabaseMetricsSummary;
    };
  }
}

if (ENABLED && typeof window !== 'undefined') {
  window.__LINKHELP_SUPABASE_METRICS__ = {
    snapshot: getSupabaseMetricsSnapshot,
    reset: resetSupabaseMetrics,
    summary: getSupabaseMetricsSummary,
    print: printSupabaseMetricsSummary,
  };
}
