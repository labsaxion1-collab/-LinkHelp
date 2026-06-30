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

  const { data, error } = await sb.rpc('submit_service_review', {
    p_request_id: input.requestId,
    p_target_user_id: input.targetUserId,
    p_rating: input.rating,
    p_comment: input.comment?.trim() || null,
    p_criteria_scores: input.criteriaScores ?? null,
    p_reviewer_role: input.reviewerRole ?? null,
  });

  if (error) {
    // Fallback for environments before SQL migration
    if (error.message?.includes('submit_service_review') || error.code === 'PGRST202') {
      const payload = {
        request_id: input.requestId,
        reviewer_id: input.reviewerId,
        target_user_id: input.targetUserId,
        rating: input.rating,
        comment: input.comment?.trim() || null,
      };
      const { data: row, error: insertErr } = await sb.from('reviews').insert(payload).select('*').single();
      if (insertErr) throw new Error(insertErr.message || 'REVIEW_SUBMIT_FAILED');
      return rowToReview(row as ReviewRow);
    }
    throw new Error(error.message || 'REVIEW_SUBMIT_FAILED');
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
  throw new Error('REVIEW_SUBMIT_FAILED');
}
