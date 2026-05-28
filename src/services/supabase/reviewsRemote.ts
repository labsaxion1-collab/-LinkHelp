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
}): Promise<ServiceReview> {
  const sb = getSupabase();
  if (!sb) throw new Error('NO_SUPABASE');

  const payload = {
    request_id: input.requestId,
    reviewer_id: input.reviewerId,
    target_user_id: input.targetUserId,
    rating: input.rating,
    comment: input.comment?.trim() || null,
  };

  const { data, error } = await sb.from('reviews').insert(payload).select('*').single();
  if (error) throw new Error(error.message || 'REVIEW_SUBMIT_FAILED');
  return rowToReview(data as ReviewRow);
}
