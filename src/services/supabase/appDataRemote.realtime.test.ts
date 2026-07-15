import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppDataRealtimeEvent } from './appDataRealtime';
import { subscribeRemoteData } from './appDataRemote';

const getSupabase = vi.fn();
vi.mock('@/lib/supabase', () => ({ getSupabase: () => getSupabase() }));

describe('subscribeRemoteData granular channel', () => {
  beforeEach(() => getSupabase.mockReset());

  it('forwards typed payloads for four domains and cleans up one channel', async () => {
    const listeners: Array<{ table: string; callback: (payload: Record<string, unknown>) => void }> = [];
    const channel = {
      on: vi.fn((_kind, filter: { table: string }, callback) => {
        listeners.push({ table: filter.table, callback });
        return channel;
      }),
      subscribe: vi.fn(() => channel),
    };
    const removeChannel = vi.fn();
    getSupabase.mockReturnValue({ channel: vi.fn(() => channel), removeChannel });
    const received: AppDataRealtimeEvent[] = [];

    const unsubscribe = subscribeRemoteData((event) => received.push(event));
    expect(listeners.map((listener) => listener.table)).toEqual(['requests', 'applications', 'upcoming_jobs', 'reviews']);

    listeners[0].callback({ eventType: 'INSERT', new: { id: 'r1' }, old: {} });
    listeners[1].callback({ eventType: 'UPDATE', new: { id: 'a1' }, old: {} });
    listeners[2].callback({ eventType: 'DELETE', new: {}, old: { id: 'u1' } });
    listeners[3].callback({ eventType: 'UNKNOWN', new: { id: 'ignored' }, old: {} });

    expect(received).toEqual([
      { table: 'requests', eventType: 'INSERT', newRow: { id: 'r1' }, oldRow: {} },
      { table: 'applications', eventType: 'UPDATE', newRow: { id: 'a1' }, oldRow: {} },
      { table: 'upcoming_jobs', eventType: 'DELETE', newRow: {}, oldRow: { id: 'u1' } },
    ]);
    unsubscribe();
    expect(removeChannel).toHaveBeenCalledOnce();
    expect(removeChannel).toHaveBeenCalledWith(channel);
  });
});
