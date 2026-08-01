import { isBaselineFinanceEnabled } from '@/config/baselineFinance';
import { getSupabase } from '@/lib/supabase';
import { measureLocalOperation } from '@/lib/dev/supabaseMetrics';
import type { Application } from '@/types/application';
import type { ApplicationRow, MapperProfile, RequestRow, ReviewRow, UpcomingJobRow } from '@/types/database';
import type { Job } from '@/types/job';
import type { ServiceReview } from '@/types/review';
import type { UpcomingJob } from '@/types/upcoming';
import { applicationRowToApp, requestRowToJob, upcomingRowToUpcoming } from './mappers';
import { reviewRowToServiceReview } from './reviewsRemote';
import { fetchProfilesAsMapperMap } from './fetchUserViews';

export type AppDataTable = 'requests' | 'applications' | 'upcoming_jobs' | 'reviews';
export type AppDataEventType = 'INSERT' | 'UPDATE' | 'DELETE';
export type AppDataRealtimeEvent = { table: AppDataTable; eventType: AppDataEventType; newRow: Record<string, unknown>; oldRow: Record<string, unknown> };
export type GranularResult<T> = { item: T | null; id: string | null; usedPayload: boolean; queries: string[] };

const EMPTY_PROFILE: MapperProfile = { name: null, avatar_url: null, rating: null, jobs_completed: null, plan_type: null };

export function eventRowId(event: AppDataRealtimeEvent): string | null {
  const value = event.eventType === 'DELETE' ? event.oldRow.id : event.newRow.id;
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function upsertSorted<T extends { id: string }>(rows: T[], item: T, compare: (a: T, b: T) => number, versionOf?: (value: T) => number | null): T[] {
  const current = rows.find((row) => row.id === item.id);
  if (current && versionOf) {
    const currentVersion = versionOf(current);
    const nextVersion = versionOf(item);
    if (currentVersion != null && nextVersion != null && nextVersion < currentVersion) return rows;
  }
  return [...rows.filter((row) => row.id !== item.id), item].sort(compare);
}

export function removeById<T extends { id: string }>(rows: T[], id: string): T[] {
  return rows.filter((row) => row.id !== id);
}

export function shouldApplyRealtimeVersion(versions: Map<string, number>, key: string, updatedAt: unknown): boolean {
  if (typeof updatedAt !== 'string') return true;
  const next = new Date(updatedAt).getTime();
  if (!Number.isFinite(next)) return true;
  const current = versions.get(key);
  if (current != null && next < current) return false;
  versions.set(key, next);
  return true;
}

export const newestFirst = <T extends { createdAt: number }>(a: T, b: T) => b.createdAt - a.createdAt;
export const scheduledFirst = (a: UpcomingJob, b: UpcomingJob) => a.scheduledAt - b.scheduledAt;

function hasFields(row: Record<string, unknown>, fields: readonly string[]): boolean {
  return fields.every((field) => Object.prototype.hasOwnProperty.call(row, field));
}

const REQUEST_FIELDS_BASE = ['id', 'client_id', 'title', 'description', 'category', 'subcategory', 'urgency', 'budget', 'location', 'address', 'city', 'region', 'postal_code', 'latitude', 'longitude', 'preferred_date', 'preferred_time_window', 'preferred_time', 'budget_type', 'budget_amount', 'currency', 'budget_min', 'budget_max', 'accepted_amount', 'exclusive_helper_id', 'status', 'created_at', 'updated_at'] as const;
const APPLICATION_FIELDS_BASE = ['id', 'request_id', 'helper_id', 'client_id', 'status', 'message', 'proposed_amount', 'is_exclusive', 'created_at', 'updated_at'] as const;

function requestFields(): readonly string[] {
  return isBaselineFinanceEnabled()
    ? [...REQUEST_FIELDS_BASE, 'service_mode']
    : REQUEST_FIELDS_BASE;
}

function applicationFields(): readonly string[] {
  return isBaselineFinanceEnabled()
    ? [...APPLICATION_FIELDS_BASE, 'lead_total_lc', 'lead_debit_lc', 'lead_service_mode']
    : APPLICATION_FIELDS_BASE;
}
const UPCOMING_FIELDS = ['id', 'request_id', 'helper_id', 'client_name', 'client_avatar', 'title', 'category', 'description', 'location', 'value_hint', 'urgency', 'scheduled_at', 'workflow_status', 'completion_requested_at', 'review_window_ends_at', 'created_at'] as const;
const REVIEW_FIELDS = ['id', 'request_id', 'reviewer_id', 'target_user_id', 'rating', 'comment', 'criteria_scores', 'reviewer_role', 'created_at'] as const;

async function selectOne<T>(table: AppDataTable, fields: readonly string[], id: string): Promise<T | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from(table).select(fields.join(',')).eq('id', id).maybeSingle();
  if (error) {
    console.warn(`[LinkHelp] granular realtime ${table} lookup`, error);
    return null;
  }
  return data as T | null;
}

async function profileFor(id: string): Promise<MapperProfile> {
  return (await fetchProfilesAsMapperMap([id])).get(id) ?? EMPTY_PROFILE;
}

export async function resolveRequestEvent(event: AppDataRealtimeEvent, current?: Job): Promise<GranularResult<Job>> {
  const id = eventRowId(event);
  if (event.eventType === 'DELETE' || !id) return { item: null, id, usedPayload: true, queries: [] };
  const complete = hasFields(event.newRow, requestFields());
  const row = complete ? event.newRow as RequestRow : await selectOne<RequestRow>('requests', requestFields(), id);
  const queries = complete ? [] : ['requests:id'];
  if (!row) return { item: null, id, usedPayload: complete, queries };
  const profile = current ? { ...EMPTY_PROFILE, name: current.clientName, avatar_url: current.clientAvatar, rating: current.clientRating ?? null } : await profileFor(row.client_id);
  if (!current) queries.push('profiles:client_id');
  return { item: requestRowToJob(row, profile), id, usedPayload: complete, queries };
}

export async function resolveApplicationEvent(event: AppDataRealtimeEvent, current?: Application): Promise<GranularResult<Application>> {
  const id = eventRowId(event);
  if (event.eventType === 'DELETE' || !id) return { item: null, id, usedPayload: true, queries: [] };
  const complete = hasFields(event.newRow, applicationFields());
  const row = complete ? event.newRow as ApplicationRow : await selectOne<ApplicationRow>('applications', applicationFields(), id);
  const queries = complete ? [] : ['applications:id'];
  if (!row) return { item: null, id, usedPayload: complete, queries };
  const profile = current
    ? { name: current.helperName, avatar_url: current.helperAvatar, rating: current.helperRating, jobs_completed: current.helperJobs, plan_type: null }
    : await profileFor(row.helper_id);
  if (!current) queries.push('profiles:helper_id');
  const item = applicationRowToApp(row, profile);
  if (current) item.chatUnlocked = current.chatUnlocked;
  else {
    const sb = getSupabase();
    if (sb) {
      const { data } = await sb.from('conversations').select('contact_unlocked').eq('request_id', row.request_id).eq('helper_id', row.helper_id).maybeSingle();
      item.chatUnlocked = Boolean((data as { contact_unlocked?: boolean } | null)?.contact_unlocked);
      queries.push('conversations:request_helper');
    }
  }
  return { item, id, usedPayload: complete, queries };
}

export async function resolveUpcomingEvent(event: AppDataRealtimeEvent): Promise<GranularResult<UpcomingJob>> {
  const id = eventRowId(event);
  if (event.eventType === 'DELETE' || !id) return { item: null, id, usedPayload: true, queries: [] };
  const complete = hasFields(event.newRow, UPCOMING_FIELDS);
  const row = complete ? event.newRow as UpcomingJobRow : await selectOne<UpcomingJobRow>('upcoming_jobs', UPCOMING_FIELDS, id);
  return { item: row ? upcomingRowToUpcoming(row) : null, id, usedPayload: complete, queries: complete ? [] : ['upcoming_jobs:id'] };
}

export async function resolveReviewEvent(event: AppDataRealtimeEvent): Promise<GranularResult<ServiceReview>> {
  const id = eventRowId(event);
  if (event.eventType === 'DELETE' || !id) return { item: null, id, usedPayload: true, queries: [] };
  const complete = hasFields(event.newRow, REVIEW_FIELDS);
  const row = complete ? event.newRow as ReviewRow : await selectOne<ReviewRow>('reviews', REVIEW_FIELDS, id);
  return { item: row ? reviewRowToServiceReview(row) : null, id, usedPayload: complete, queries: complete ? [] : ['reviews:id'] };
}

export async function measureGranularHandler<T>(event: AppDataRealtimeEvent, handler: () => Promise<GranularResult<T>>): Promise<GranularResult<T>> {
  return measureLocalOperation(
    { operationName: `realtime-${event.table}-${event.eventType.toLowerCase()}`, domain: 'app-data-realtime', table: event.table, action: 'api', sourceLabel: `granular:${event.table}:${event.eventType}` },
    handler,
    (result) => ({ data: { handler: event.table, eventType: event.eventType, usedPayload: result.usedPayload, queries: result.queries }, rowCount: result.item ? 1 : 0 }),
  );
}
