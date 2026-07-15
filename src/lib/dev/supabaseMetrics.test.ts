import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createRefreshCycleId,
  estimateApproximateBytes,
  getSupabaseMetricsSnapshot,
  getSupabaseMetricsSummary,
  instrumentedSupabaseFetch,
  measureLocalOperation,
  recordRealtimeChannelCreated,
  recordRealtimeChannelRemoved,
  recordRealtimeEvent,
  resetSupabaseMetrics,
  setActiveRefreshCycle,
} from './supabaseMetrics';

const originalFetch = globalThis.fetch;
const MOCK_ROW = { id: 'mock' };
const APP_DATA_TABLES = [
  'requests',
  'applications',
  'upcoming_jobs',
  'notifications',
  'conversations',
  'profiles',
  'reviews',
] as const;

function mockJsonFetch(): void {
  globalThis.fetch = vi.fn(async () =>
    new Response(JSON.stringify([MOCK_ROW]), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  );
}

async function simulateRefresh(source: string): Promise<void> {
  const cycleId = createRefreshCycleId(source);
  setActiveRefreshCycle(cycleId);
  try {
    await Promise.all(
      APP_DATA_TABLES.map((table) =>
        instrumentedSupabaseFetch(`https://mock.supabase.co/rest/v1/${table}?select=*`),
      ),
    );
  } finally {
    setActiveRefreshCycle(null);
  }
}

describe('Supabase DEV metrics baseline', () => {
  beforeEach(() => {
    resetSupabaseMetrics();
    mockJsonFetch();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('estimates bytes without retaining the serialized payload', () => {
    expect(estimateApproximateBytes([MOCK_ROW])).toBe(new TextEncoder().encode(JSON.stringify([MOCK_ROW])).length);
  });

  it('returns null when a value cannot be serialized', () => {
    const circular: { self?: unknown } = {};
    circular.self = circular;
    expect(estimateApproximateBytes(circular)).toBeNull();
  });

  it('records the initial app-data load as seven structural operations', async () => {
    await simulateRefresh('initial-auth-load');
    const snapshot = getSupabaseMetricsSnapshot();
    expect(snapshot.operations).toHaveLength(7);
    expect(snapshot.operations.map((item) => item.table).sort()).toEqual([...APP_DATA_TABLES].sort());
    expect(new Set(snapshot.operations.map((item) => item.refreshCycleId)).size).toBe(1);
  });

  it.each([
    'realtime-requests-insert',
    'realtime-requests-update',
    'realtime-requests-delete',
    'realtime-applications-insert',
    'realtime-applications-update',
    'realtime-upcoming_jobs-update',
    'realtime-reviews-insert',
  ])('%s currently triggers the same seven-query refresh baseline', async (source) => {
    await simulateRefresh(source);
    const snapshot = getSupabaseMetricsSnapshot();
    expect(snapshot.operations).toHaveLength(7);
    expect(snapshot.operations.every((item) => item.refreshCycleId?.startsWith(source))).toBe(true);
  });

  it('records notification realtime without exposing the user id', () => {
    recordRealtimeChannelCreated({
      channelName: 'linkhelp-notifs-user',
      tables: ['notifications'],
      filters: ['user_id=eq.[redacted]'],
      listenerCount: 3,
    });
    recordRealtimeEvent('linkhelp-notifs-user', 'notifications', 'INSERT');
    const channel = getSupabaseMetricsSnapshot().channels[0];
    expect(channel.channelName).toBe('linkhelp-notifs-user');
    expect(channel.filters).toEqual(['user_id=eq.[redacted]']);
    expect(channel.events['notifications:INSERT']).toBe(1);
  });

  it('records conversation channel creation, events and removal', () => {
    recordRealtimeChannelCreated({
      channelName: 'linkhelp-conversation',
      tables: ['messages', 'conversations'],
      filters: ['conversation_id=eq.[redacted]'],
      listenerCount: 2,
    });
    recordRealtimeEvent('linkhelp-conversation', 'messages', 'INSERT');
    recordRealtimeChannelRemoved('linkhelp-conversation');
    const snapshot = getSupabaseMetricsSnapshot();
    expect(snapshot.activeChannelCount).toBe(0);
    expect(snapshot.channels[0]).toMatchObject({ creations: 1, removals: 1, active: false });
  });

  it.each([
    ['open-conversation', 'conversations'],
    ['load-messages', 'messages'],
    ['load-wallet', 'credit_wallets'],
    ['load-transactions', 'credit_transactions'],
    ['load-unlocks', 'opportunity_unlocks'],
    ['load-portfolio', 'helper_portfolio_items'],
    ['gamification-snapshot', 'user_gamification'],
  ])('captures the %s table operation', async (_flow, table) => {
    await instrumentedSupabaseFetch(`https://mock.supabase.co/rest/v1/${table}?select=*`);
    expect(getSupabaseMetricsSnapshot().operations[0]).toMatchObject({ table, action: 'select', rowCount: 1 });
  });

  it('records gamification API calls locally', async () => {
    await measureLocalOperation(
      { operationName: 'gamification-me', domain: 'gamification', table: 'api/gamification/me', action: 'api', sourceLabel: 'test' },
      async () => MOCK_ROW,
    );
    expect(getSupabaseMetricsSnapshot().operations[0]).toMatchObject({
      operationName: 'gamification-me',
      table: 'api/gamification/me',
      success: true,
    });
  });

  it('aggregates calls, rows, bytes and duration without payloads', async () => {
    await instrumentedSupabaseFetch('https://mock.supabase.co/rest/v1/messages?select=*');
    await instrumentedSupabaseFetch('https://mock.supabase.co/rest/v1/messages?select=*');
    const summary = getSupabaseMetricsSummary().operations[0];
    expect(summary.calls).toBe(2);
    expect(summary.rows).toBe(2);
    expect(summary.approximateBytes).toBe(estimateApproximateBytes([MOCK_ROW])! * 2);
    expect(Object.keys(summary)).not.toContain('data');
  });
});
