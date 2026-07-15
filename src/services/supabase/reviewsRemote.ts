import { getSupabase } from '@/lib/supabase';
import type { ReviewRow } from '@/types/database';
import type { ServiceReview } from '@/types/review';
import {
  logReviewSubmitFailure,
  ReviewSubmitError,
  shouldFallbackToDirectReviewInsert,
  toReviewSubmitError,
} from '@/utils/reviewSubmitErrors';

export function reviewRowToReview(row: ReviewRow): ServiceReview {
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

function parseRpcReviewId(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const row = data as Record<string, unknown>;
  const id = row.reviewId ?? row.review_id;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

function synthesizeReviewFromSubmit(
  input: {
    requestId: string;
    reviewerId: string;
    targetUserId: string;
    rating: number;
    comment?: string | null;
    criteriaScores?: Record<string, number> | null;
    reviewerRole?: 'client' | 'helper';
  },
  reviewId?: string | null,
): ServiceReview {
  return {
    id: reviewId ?? `review_${input.requestId}_${input.reviewerId}`,
    requestId: input.requestId,
    reviewerId: input.reviewerId,
    targetUserId: input.targetUserId,
    rating: input.rating,
    comment: input.comment?.trim() || null,
    criteriaScores: input.criteriaScores ?? null,
    reviewerRole: input.reviewerRole ?? null,
    createdAt: Date.now(),
  };
}

async function resolveAuthenticatedReviewerId(sb: NonNullable<ReturnType<typeof getSupabase>>): Promise<string> {
  const {
    data: { session },
    error,
  } = await sb.auth.getSession();
  if (error) {
    logReviewSubmitFailure('rpc', error, { phaseNote: 'getSession' });
  }
  const sessionUserId = session?.user?.id;
  if (!sessionUserId) {
    throw new ReviewSubmitError('AUTH_REQUIRED', 'AUTH_REQUIRED');
  }
  return sessionUserId;
}

export async function fetchRemoteReviews(): Promise<ServiceReview[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from('reviews').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error('[LinkHelp] fetch reviews', error);
    return [];
  }
  return ((data ?? []) as ReviewRow[]).map(reviewRowToReview);
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
  if (!sb) throw new ReviewSubmitError('NO_SUPABASE', 'AUTH_REQUIRED');

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
      targetUserId: input.targetUserId,
      reviewerRole: input.reviewerRole ?? null,
    });
    if (error.code === '23505') {
      throw new ReviewSubmitError('ALREADY_REVIEWED', 'ALREADY_REVIEWED');
    }
    throw toReviewSubmitError(error);
  }

  return reviewRowToReview(data as ReviewRow);
}

async function loadSubmittedReview(
  sb: NonNullable<ReturnType<typeof getSupabase>>,
  input: {
    requestId: string;
    reviewerId: string;
    targetUserId: string;
    rating: number;
    comment?: string | null;
    criteriaScores?: Record<string, number> | null;
    reviewerRole?: 'client' | 'helper';
  },
  reviewId: string | null,
): Promise<ServiceReview> {
  if (reviewId) {
    const { data: row, error: selectError } = await sb.from('reviews').select('*').eq('id', reviewId).single();
    if (selectError) {
      logReviewSubmitFailure('select', selectError, { reviewId });
    }
    if (row) return reviewRowToReview(row as ReviewRow);
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
    logReviewSubmitFailure('select', latestError, {
      requestId: input.requestId,
      reviewerId: input.reviewerId,
    });
  }
  if (latest) return reviewRowToReview(latest as ReviewRow);

  console.warn('[LinkHelp] review saved but row not readable — using synthesized local row', {
    requestId: input.requestId,
    reviewerId: input.reviewerId,
    reviewId,
  });
  return synthesizeReviewFromSubmit(input, reviewId);
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

  const sessionReviewerId = await resolveAuthenticatedReviewerId(sb);
  const normalizedInput = {
    ...input,
    reviewerId: sessionReviewerId,
  };
  const rating = Math.min(5, Math.max(1, Math.round(normalizedInput.rating)));

  const rpcPayload = {
    p_request_id: normalizedInput.requestId,
    p_target_user_id: normalizedInput.targetUserId,
    p_rating: rating,
    p_comment: normalizedInput.comment?.trim() || null,
    p_criteria_scores: normalizedInput.criteriaScores ?? null,
  };

  console.info('[LinkHelp] submit review attempt', {
    requestId: rpcPayload.p_request_id,
    targetUserId: rpcPayload.p_target_user_id,
    reviewerId: normalizedInput.reviewerId,
    reviewerRoleHint: normalizedInput.reviewerRole ?? null,
    rating,
  });

  const { data, error } = await sb.rpc('submit_service_review', rpcPayload);

  if (error) {
    logReviewSubmitFailure('rpc', error, {
      requestId: normalizedInput.requestId,
      targetUserId: normalizedInput.targetUserId,
      reviewerId: normalizedInput.reviewerId,
      reviewerRole: normalizedInput.reviewerRole ?? null,
      rpcPayload,
    });

    if (shouldFallbackToDirectReviewInsert(error)) {
      console.warn('[LinkHelp] submit review RPC unavailable — direct insert fallback');
      return insertReviewDirect({ ...normalizedInput, rating });
    }

    throw toReviewSubmitError(error);
  }

  const reviewId = parseRpcReviewId(data);
  console.info('[LinkHelp] submit review RPC ok', { reviewId, data });
  return loadSubmittedReview(sb, { ...normalizedInput, rating }, reviewId);
}
