import { getSupabase } from '@/lib/supabase';
import type { ReviewRow } from '@/types/database';
import type { ServiceReview } from '@/types/review';

function rowToReview(row: ReviewRow): ServiceReview {
  return {
    id: row.id,
    requestId: row.request_id,
    reviewerId: row.reviewer_id,
    targetUserId: row.target_user_id,
    rating: row.rating,
    comment: row.comment,
    criteriaScores: row.criteria_scores ?? null,
    reviewerRole: row.reviewer_role === 'client' || row.reviewer_role === 'helper' ? row.reviewer_role : null,
    createdAt: new Date(row.created_at).getTime(),
  };
}

export async function fetchRemoteReviews(): Promise<ServiceReview[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from('reviews').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error('[LinkHelp] fetch reviews', error);
    return [];
  }
  return ((data ?? []) as ReviewRow[]).map(rowToReview);
}

async function insertReviewDirect(input: {
  requestId: string;
  reviewerId: string;
  targetUserId: string;
  rating: number;
  comment?: string | null;
  criteriaScores?: Record<string, number> | null;
  reviewerRole?: 'client' | 'helper';
}): Promise<ServiceReview> {
  const sb = getSupabase();
  if (!sb) throw new Error('NO_SUPABASE');

  const rating = Math.min(5, Math.max(1, Math.round(input.rating)));
  const basePayload = {
    request_id: input.requestId,
    reviewer_id: input.reviewerId,
    target_user_id: input.targetUserId,
    rating,
    comment: input.comment?.trim() || null,
  };

  const withExtras = {
    ...basePayload,
    criteria_scores: input.criteriaScores ?? null,
    reviewer_role: input.reviewerRole ?? null,
  };

  let { data, error } = await sb.from('reviews').insert(withExtras).select('*').single();
  if (error && (error.message?.includes('criteria_scores') || error.message?.includes('reviewer_role'))) {
    ({ data, error } = await sb.from('reviews').insert(basePayload).select('*').single());
  }
  if (error) throw new Error(error.message || 'REVIEW_SUBMIT_FAILED');
  return rowToReview(data as ReviewRow);
}

export async function remoteSubmitReview(input: {
  requestId: string;
  reviewerId: string;
  targetUserId: string;
  rating: number;
  comment?: string | null;
  criteriaScores?: Record<string, number> | null;
  reviewerRole?: 'client' | 'helper';
}): Promise<ServiceReview> {
  const sb = getSupabase();
  if (!sb) throw new Error('NO_SUPABASE');

  const rating = Math.min(5, Math.max(1, Math.round(input.rating)));

  const { data, error } = await sb.rpc('submit_service_review', {
    p_request_id: input.requestId,
    p_target_user_id: input.targetUserId,
    p_rating: rating,
    p_comment: input.comment?.trim() || null,
    p_criteria_scores: input.criteriaScores ?? null,
    p_reviewer_role: input.reviewerRole ?? null,
  });

  if (error) {
    const msg = error.message || '';
    const useDirectInsert =
      error.code === 'PGRST202' ||
      msg.includes('submit_service_review') ||
      msg.includes('REQUEST_NOT_COMPLETED') ||
      msg.includes('ROLE_MISMATCH') ||
      msg.includes('function') ||
      msg.includes('does not exist');

    if (useDirectInsert) {
      return insertReviewDirect({ ...input, rating });
    }
    throw new Error(msg || 'REVIEW_SUBMIT_FAILED');
  }

  const reviewId = (data as { reviewId?: string })?.reviewId;
  if (reviewId) {
    const { data: row } = await sb.from('reviews').select('*').eq('id', reviewId).single();
    if (row) return rowToReview(row as ReviewRow);
  }

  const { data: latest } = await sb
    .from('reviews')
    .select('*')
    .eq('request_id', input.requestId)
    .eq('reviewer_id', input.reviewerId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latest) return rowToReview(latest as ReviewRow);

  return insertReviewDirect({ ...input, rating });
}
