import type { ServiceReview } from '@/types/review';

export function buildReviewCountByUserId(reviews: ServiceReview[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of reviews) {
    map.set(r.targetUserId, (map.get(r.targetUserId) ?? 0) + 1);
  }
  return map;
}
