import { getSupabase } from '@/lib/supabase';
import type { ReviewRow } from '@/types/database';
import type { ServiceReview } from '@/types/review';
import {
  logReviewSubmitFailure,
  ReviewSubmitError,
  shouldFallbackToDirectReviewInsert,
  toReviewSubmitError,
} from '@/utils/reviewSubmitErrors';

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
  if (error) {
    const missingExtrasColumn =
      error.code === '42703' ||
      error.message?.includes('criteria_scores') ||
      error.message?.includes('reviewer_role');
    if (missingExtrasColumn) {
      ({ data, error } = await sb.from('reviews').insert(basePayload).select('*').single());
    }
  }

  if (error) {
    logReviewSubmitFailure('insert', error, {
      requestId: input.requestId,
      reviewerId: input.reviewerId,
    });
    if (error.code === '23505') {
      throw new ReviewSubmitError('ALREADY_REVIEWED', 'ALREADY_REVIEWED');
    }
    throw toReviewSubmitError(error);
  }

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
  if (!sb) throw new ReviewSubmitError('NO_SUPABASE', 'AUTH_REQUIRED');

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
    logReviewSubmitFailure('rpc', error, {
      requestId: input.requestId,
      targetUserId: input.targetUserId,
      reviewerRole: input.reviewerRole ?? null,
    });

    if (shouldFallbackToDirectReviewInsert(error)) {
      return insertReviewDirect({ ...input, rating });
    }

    throw toReviewSubmitError(error);
  }

  const reviewId = (data as { reviewId?: string })?.reviewId;
  if (reviewId) {
    const { data: row, error: selectError } = await sb.from('reviews').select('*').eq('id', reviewId).single();
    if (selectError) {
      logReviewSubmitFailure('select', selectError, { reviewId });
    }
    if (row) return rowToReview(row as ReviewRow);
  }

  const { data: latest, error: latestError } = await sb
    .from('reviews')
    .select('*')
    .eq('request_id', input.requestId)
    .eq('reviewer_id', input.reviewerId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) {
    logReviewSubmitFailure('select', latestError, { requestId: input.requestId });
  }
  if (latest) return rowToReview(latest as ReviewRow);

  return insertReviewDirect({ ...input, rating });
}
