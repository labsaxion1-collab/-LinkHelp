import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveApplicationEvent, resolveRequestEvent, resolveReviewEvent, resolveUpcomingEvent, type AppDataRealtimeEvent } from './appDataRealtime';

const getSupabase = vi.fn();
vi.mock('@/lib/supabase', () => ({ getSupabase: () => getSupabase() }));
vi.mock('./fetchUserViews', () => ({ fetchProfilesAsMapperMap: vi.fn(async () => new Map()) }));

const event = (table: AppDataRealtimeEvent['table'], row: Record<string, unknown>): AppDataRealtimeEvent => ({ table, eventType: 'UPDATE', newRow: row, oldRow: {} });
const request = {
  id: 'r1', client_id: 'c1', title: 'Job', description: 'Desc', category: 'cleaning', subcategory: null, urgency: 'normal', budget: '$20', location: 'Toronto', address: null, city: null, region: null, postal_code: null, latitude: null, longitude: null, preferred_date: null, preferred_time_window: null, preferred_time: null, budget_type: null, budget_amount: null, currency: null, budget_min: null, budget_max: null, accepted_amount: null, exclusive_helper_id: null, status: 'open', expires_at: '2026-07-21T10:00:00Z', created_at: '2026-07-14T10:00:00Z', updated_at: '2026-07-14T11:00:00Z', service_mode: 'in_person',
};
const application = { id: 'a1', request_id: 'r1', helper_id: 'h1', client_id: 'c1', status: 'pending', message: null, proposed_amount: null, is_exclusive: false, created_at: '2026-07-14T10:00:00Z', updated_at: '2026-07-14T11:00:00Z', lead_total_lc: null, lead_debit_lc: null, lead_service_mode: null };
const upcoming = { id: 'u1', request_id: 'r1', helper_id: 'h1', client_name: 'Client', client_avatar: null, title: 'Job', category: 'cleaning', description: 'Desc', location: 'Toronto', value_hint: '$20', urgency: 'normal', scheduled_at: '2026-07-15T10:00:00Z', workflow_status: 'scheduled', completion_requested_at: null, review_window_ends_at: null, created_at: '2026-07-14T10:00:00Z' };
const review = { id: 'v1', request_id: 'r1', reviewer_id: 'c1', target_user_id: 'h1', rating: 5, comment: null, criteria_scores: null, reviewer_role: 'client', created_at: '2026-07-14T10:00:00Z' };

describe('granular payload resolution', () => {
  beforeEach(() => getSupabase.mockClear());
  it('updates a request from payload without any Supabase query', async () => {
    const current = { id: 'r1', clientName: 'Client', clientAvatar: 'avatar', clientRating: 5 } as never;
    const result = await resolveRequestEvent(event('requests', request), current);
    expect(result.queries).toEqual([]);
    expect(result.item?.title).toBe('Job');
    expect(getSupabase).not.toHaveBeenCalled();
  });

  it('updates an application from payload and preserves chatUnlocked', async () => {
    const current = { id: 'a1', helperName: 'Helper', helperAvatar: 'avatar', helperRating: 5, helperJobs: 3, chatUnlocked: true } as never;
    const result = await resolveApplicationEvent(event('applications', application), current);
    expect(result.queries).toEqual([]);
    expect(result.item?.chatUnlocked).toBe(true);
    expect(getSupabase).not.toHaveBeenCalled();
  });

  it('maps upcoming payload and preserves scheduled fields without queries', async () => {
    const result = await resolveUpcomingEvent(event('upcoming_jobs', upcoming));
    expect(result.queries).toEqual([]);
    expect(result.item?.jobId).toBe('r1');
    expect(getSupabase).not.toHaveBeenCalled();
  });

  it('maps review payload without table or profile queries', async () => {
    const result = await resolveReviewEvent(event('reviews', review));
    expect(result.queries).toEqual([]);
    expect(result.item?.rating).toBe(5);
    expect(getSupabase).not.toHaveBeenCalled();
  });
});
