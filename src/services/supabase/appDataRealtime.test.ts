import { describe, expect, it } from 'vitest';
import { eventRowId, newestFirst, removeById, scheduledFirst, shouldApplyRealtimeVersion, upsertSorted, type AppDataRealtimeEvent } from './appDataRealtime';

const event = (table: AppDataRealtimeEvent['table'], eventType: AppDataRealtimeEvent['eventType'], row: Record<string, unknown>): AppDataRealtimeEvent => ({
  table,
  eventType,
  newRow: eventType === 'DELETE' ? {} : row,
  oldRow: eventType === 'DELETE' ? row : {},
});

describe('app data granular realtime state', () => {
  it('inserts, replaces and deduplicates an item', () => {
    const first = { id: '1', createdAt: 1, value: 'old' };
    const inserted = upsertSorted([], first, newestFirst);
    const repeated = upsertSorted(inserted, first, newestFirst);
    const updated = upsertSorted(repeated, { ...first, value: 'new' }, newestFirst);
    expect(inserted).toEqual([first]);
    expect(repeated).toHaveLength(1);
    expect(updated).toEqual([{ ...first, value: 'new' }]);
  });

  it('ignores an older updated_at version', () => {
    const versions = new Map<string, number>();
    expect(shouldApplyRealtimeVersion(versions, 'requests:r1', '2026-07-14T11:00:00Z')).toBe(true);
    expect(shouldApplyRealtimeVersion(versions, 'requests:r1', '2026-07-14T10:00:00Z')).toBe(false);
  });

  it('removes only the requested id', () => {
    expect(removeById([{ id: '1' }, { id: '2' }], '1')).toEqual([{ id: '2' }]);
  });

  it('reads delete id from old and rejects missing ids', () => {
    expect(eventRowId(event('requests', 'DELETE', { id: 'r1' }))).toBe('r1');
    expect(eventRowId(event('requests', 'DELETE', {}))).toBeNull();
  });

  it('preserves newest-first ordering', () => {
    const rows = upsertSorted([{ id: '1', createdAt: 1 }], { id: '2', createdAt: 2 }, newestFirst);
    expect(rows.map((row) => row.id)).toEqual(['2', '1']);
  });

  it('preserves upcoming scheduled ordering', () => {
    const rows = upsertSorted(
      [{ id: '1', scheduledAt: 2 } as never],
      { id: '2', scheduledAt: 1 } as never,
      scheduledFirst,
    );
    expect(rows.map((row) => row.id)).toEqual(['2', '1']);
  });

  it.each(['requests', 'applications', 'upcoming_jobs', 'reviews'] as const)('extracts ids for %s events', (table) => {
    expect(eventRowId(event(table, 'INSERT', { id: 'row-id' }))).toBe('row-id');
    expect(eventRowId(event(table, 'UPDATE', { id: 'row-id' }))).toBe('row-id');
    expect(eventRowId(event(table, 'DELETE', { id: 'row-id' }))).toBe('row-id');
  });
});
