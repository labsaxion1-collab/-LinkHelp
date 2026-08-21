import { getSupabase } from '@/lib/supabase';
import type { Application } from '@/types/application';
import type { Job } from '@/types/job';
import type { ApplicationRow, RequestRow, ReviewRow, UpcomingJobRow } from '@/types/database';
import type { ServiceReview } from '@/types/review';
import type { UpcomingJob } from '@/types/upcoming';
import { queryWithOptionalColumnFallback } from '@/services/supabase/optionalBootstrapSelect';
import { UPCOMING_JOB_SELECT } from '@/services/supabase/appDataRemote';
import { resolveRequestStatusPatch } from '@/utils/statusNormalize';

const REVIEW_SELECT =
  'id, request_id, reviewer_id, target_user_id, rating, comment, criteria_scores, reviewer_role, created_at';

function hasString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/** INSERT/UPDATE payloads are full rows by default; DELETE old may be pk-only without REPLICA IDENTITY FULL. */
export function isCompleteRequestRow(row: Partial<RequestRow>): row is RequestRow {
  return (
    hasString(row.id) &&
    hasString(row.client_id) &&
    hasString(row.title) &&
    hasString(row.category) &&
    hasString(row.status) &&
    hasString(row.created_at)
  );
}

export function isCompleteApplicationRow(row: Partial<ApplicationRow>): row is ApplicationRow {
  return (
    hasString(row.id) &&
    hasString(row.request_id) &&
    hasString(row.helper_id) &&
    hasString(row.client_id) &&
    hasString(row.status) &&
    hasString(row.created_at)
  );
}

export function isCompleteUpcomingJobRow(row: Partial<UpcomingJobRow>): row is UpcomingJobRow {
  return (
    hasString(row.id) &&
    hasString(row.request_id) &&
    hasString(row.helper_id) &&
    hasString(row.title) &&
    hasString(row.scheduled_at) &&
    hasString(row.workflow_status) &&
    hasString(row.created_at)
  );
}

export function isCompleteReviewRow(row: Partial<ReviewRow>): row is ReviewRow {
  return (
    hasString(row.id) &&
    hasString(row.request_id) &&
    hasString(row.reviewer_id) &&
    hasString(row.target_user_id) &&
    typeof row.rating === 'number' &&
    hasString(row.created_at)
  );
}

export function mergeRequestRowWithJob(partial: Partial<RequestRow>, existing: Job): RequestRow {
  return {
    id: partial.id ?? existing.id,
    client_id: partial.client_id ?? existing.clientId,
    title: partial.title ?? existing.title,
    description: partial.description ?? existing.description,
    category: partial.category ?? existing.category,
    subcategory: partial.subcategory !== undefined ? partial.subcategory : existing.subcategory ?? null,
    urgency: partial.urgency ?? existing.urgency,
    budget: partial.budget !== undefined ? partial.budget : existing.value === '---' ? null : existing.value,
    location: partial.location ?? existing.location,
    address: partial.address !== undefined ? partial.address : existing.address ?? null,
    city: partial.city !== undefined ? partial.city : existing.city ?? null,
    region: partial.region !== undefined ? partial.region : existing.region ?? null,
    postal_code: partial.postal_code !== undefined ? partial.postal_code : existing.postalCode ?? null,
    latitude: partial.latitude !== undefined ? partial.latitude : existing.latitude ?? null,
    longitude: partial.longitude !== undefined ? partial.longitude : existing.longitude ?? null,
    preferred_date: partial.preferred_date !== undefined ? partial.preferred_date : existing.preferredDate ?? null,
    preferred_time_window:
      partial.preferred_time_window !== undefined
        ? partial.preferred_time_window
        : existing.preferredTimeWindow ?? null,
    preferred_time: partial.preferred_time !== undefined ? partial.preferred_time : existing.preferredTime ?? null,
    budget_type: partial.budget_type !== undefined ? partial.budget_type : existing.budgetType ?? null,
    budget_amount: partial.budget_amount !== undefined ? partial.budget_amount : existing.budgetAmount ?? null,
    currency: partial.currency !== undefined ? partial.currency : existing.currency ?? null,
    budget_min: partial.budget_min !== undefined ? partial.budget_min : existing.budgetMin ?? null,
    budget_max: partial.budget_max !== undefined ? partial.budget_max : existing.budgetMax ?? null,
    accepted_amount: partial.accepted_amount !== undefined ? partial.accepted_amount : existing.acceptedAmount ?? null,
    application_count: partial.application_count ?? existing.applicantCount ?? 0,
    exclusive_helper_id:
      partial.exclusive_helper_id !== undefined ? partial.exclusive_helper_id : existing.exclusiveHelperId ?? null,
    status: resolveRequestStatusPatch(existing.status, (partial.status ?? existing.status) as Job['status']) as RequestRow['status'],
    expires_at:
      partial.expires_at !== undefined
        ? partial.expires_at
        : existing.expiresAt != null
          ? new Date(existing.expiresAt).toISOString()
          : null,
    created_at: partial.created_at ?? new Date(existing.createdAt).toISOString(),
    updated_at: partial.updated_at ?? new Date(existing.createdAt).toISOString(),
  };
}

export function mergeApplicationRowWithApp(
  partial: Partial<ApplicationRow>,
  existing: Application,
): ApplicationRow {
  return {
    id: partial.id ?? existing.id,
    request_id: partial.request_id ?? existing.jobId,
    helper_id: partial.helper_id ?? existing.helperId,
    client_id: partial.client_id ?? existing.clientId,
    status: (partial.status ?? existing.status) as ApplicationRow['status'],
    message: partial.message !== undefined ? partial.message : existing.message ?? null,
    proposed_amount:
      partial.proposed_amount !== undefined ? partial.proposed_amount : existing.proposedAmount ?? null,
    is_exclusive: partial.is_exclusive !== undefined ? partial.is_exclusive : existing.isExclusive ?? null,
    created_at: partial.created_at ?? new Date(existing.createdAt).toISOString(),
    updated_at: partial.updated_at ?? new Date(existing.createdAt).toISOString(),
  };
}

export function mergeUpcomingRowWithJob(
  partial: Partial<UpcomingJobRow>,
  existing: UpcomingJob,
): UpcomingJobRow {
  return {
    id: partial.id ?? existing.id,
    request_id: partial.request_id ?? existing.jobId,
    helper_id: partial.helper_id ?? existing.helperId,
    client_name: partial.client_name ?? existing.clientName,
    client_avatar: partial.client_avatar !== undefined ? partial.client_avatar : existing.clientAvatar ?? null,
    title: partial.title ?? existing.title,
    category: partial.category ?? existing.category,
    description: partial.description ?? existing.description,
    location: partial.location ?? existing.location,
    value_hint: partial.value_hint !== undefined ? partial.value_hint : existing.value ?? null,
    urgency: partial.urgency ?? existing.urgency,
    scheduled_at: partial.scheduled_at ?? new Date(existing.scheduledAt).toISOString(),
    workflow_status: partial.workflow_status ?? existing.workflowStatus,
    completion_requested_at:
      partial.completion_requested_at !== undefined
        ? partial.completion_requested_at
        : existing.completionRequestedAt
          ? new Date(existing.completionRequestedAt).toISOString()
          : null,
    review_window_ends_at:
      partial.review_window_ends_at !== undefined
        ? partial.review_window_ends_at
        : existing.reviewWindowEndsAt
          ? new Date(existing.reviewWindowEndsAt).toISOString()
          : null,
    created_at: partial.created_at ?? new Date(existing.createdAt).toISOString(),
  };
}

export function mergeReviewRowWithReview(
  partial: Partial<ReviewRow>,
  existing: ServiceReview,
): ReviewRow {
  return {
    id: partial.id ?? existing.id,
    request_id: partial.request_id ?? existing.requestId,
    reviewer_id: partial.reviewer_id ?? existing.reviewerId,
    target_user_id: partial.target_user_id ?? existing.targetUserId,
    rating: partial.rating ?? existing.rating,
    comment: partial.comment !== undefined ? partial.comment : existing.comment ?? null,
    criteria_scores:
      partial.criteria_scores !== undefined ? partial.criteria_scores : existing.criteriaScores ?? null,
    reviewer_role: partial.reviewer_role !== undefined ? partial.reviewer_role : existing.reviewerRole ?? null,
    created_at: partial.created_at ?? new Date(existing.createdAt).toISOString(),
  };
}

export async function fetchRequestRowById(id: string): Promise<RequestRow | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await queryWithOptionalColumnFallback('requests', 'fetchRequestRowById', async (select) => {
    const result = await sb.from('requests').select(select).eq('id', id).maybeSingle();
    return { data: result.data, error: result.error };
  });
  if (error || !data) return null;
  return data as unknown as RequestRow;
}

export async function fetchApplicationRowById(id: string): Promise<ApplicationRow | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await queryWithOptionalColumnFallback(
    'applications',
    'fetchApplicationRowById',
    async (select) => {
      const result = await sb.from('applications').select(select).eq('id', id).maybeSingle();
      return { data: result.data, error: result.error };
    },
  );
  if (error || !data) return null;
  return data as unknown as ApplicationRow;
}

export async function fetchUpcomingJobRowById(id: string): Promise<UpcomingJobRow | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from('upcoming_jobs').select(UPCOMING_JOB_SELECT).eq('id', id).maybeSingle();
  if (error || !data) {
    if (error) console.warn('[LinkHelp] fetchUpcomingJobRowById', error.message);
    return null;
  }
  return data as UpcomingJobRow;
}

export async function fetchReviewRowById(id: string): Promise<ReviewRow | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from('reviews').select(REVIEW_SELECT).eq('id', id).maybeSingle();
  if (error || !data) {
    if (error) console.warn('[LinkHelp] fetchReviewRowById', error.message);
    return null;
  }
  return data as ReviewRow;
}

export async function resolveRequestRowForPatch(
  row: Partial<RequestRow>,
  existing: Job | undefined,
): Promise<RequestRow | null> {
  if (isCompleteRequestRow(row)) return row;
  if (existing) return mergeRequestRowWithJob(row, existing);
  if (!hasString(row.id)) return null;
  return fetchRequestRowById(row.id);
}

export async function resolveApplicationRowForPatch(
  row: Partial<ApplicationRow>,
  existing: Application | undefined,
): Promise<ApplicationRow | null> {
  if (isCompleteApplicationRow(row)) return row;
  if (existing) return mergeApplicationRowWithApp(row, existing);
  if (!hasString(row.id)) return null;
  return fetchApplicationRowById(row.id);
}

export async function resolveUpcomingJobRowForPatch(
  row: Partial<UpcomingJobRow>,
  existing: UpcomingJob | undefined,
): Promise<UpcomingJobRow | null> {
  if (isCompleteUpcomingJobRow(row)) return row;
  if (existing) return mergeUpcomingRowWithJob(row, existing);
  if (!hasString(row.id)) return null;
  return fetchUpcomingJobRowById(row.id);
}

export async function resolveReviewRowForPatch(
  row: Partial<ReviewRow>,
  existing: ServiceReview | undefined,
): Promise<ReviewRow | null> {
  if (isCompleteReviewRow(row)) return row;
  if (existing) return mergeReviewRowWithReview(row, existing);
  if (!hasString(row.id)) return null;
  return fetchReviewRowById(row.id);
}
