import {
  CLIENT_REVIEW_HELPER_CRITERIA,
  HELPER_REVIEW_CLIENT_CRITERIA,
  type ReviewCriterionKey,
} from '@/config/reviewCriteria';
import {
  getClientRank,
  getHelperRank,
  hasRankableStats,
  type ClientRankDef,
  type HelperRankDef,
  type ReputationInput,
} from '@/utils/linkHelpRanking';
import type { ServiceReview } from '@/types/review';

export type PublicReputationReview = {
  rating: number;
  comment: string | null;
  createdAt: number;
  reviewerRole: 'client' | 'helper' | null;
};

export type PublicReputationDossier = {
  userId: string;
  role: 'client' | 'helper';
  completedCount: number;
  publishedCount: number | null;
  averageRating: number;
  reviewCount: number;
  memberSince: number | null;
  trustScore: number;
  rank: HelperRankDef | ClientRankDef | null;
  criteriaAverages: Partial<Record<ReviewCriterionKey, number>>;
  recentReviews: PublicReputationReview[];
  loading: boolean;
  source: 'rpc' | 'local' | 'mixed';
};

export type ReputationDossierRpcPayload = {
  role?: string;
  completedCount?: number;
  publishedCount?: number;
  averageRating?: number;
  cancelledCount?: number;
  reviewCount?: number;
  memberSince?: string;
  criteriaAverages?: Record<string, number>;
  recentReviews?: Array<{
    rating?: number;
    comment?: string | null;
    createdAt?: string;
    reviewerRole?: string | null;
  }>;
};

const CLIENT_CRITERIA_KEYS = new Set(CLIENT_REVIEW_HELPER_CRITERIA.map((c) => c.key));
const HELPER_CRITERIA_KEYS = new Set(HELPER_REVIEW_CLIENT_CRITERIA.map((c) => c.key));

export function computeTrustScore(completedCount: number, averageRating: number, reviewCount: number): number {
  if (completedCount <= 0 && reviewCount <= 0 && averageRating <= 0) return 0;
  return Math.min(100, Math.round(completedCount * 6 + averageRating * 12 + reviewCount * 2));
}

function expectedReviewerRole(targetRole: 'client' | 'helper'): 'client' | 'helper' {
  return targetRole === 'helper' ? 'client' : 'helper';
}

function filterReviewsForTarget(
  reviews: ServiceReview[],
  targetUserId: string,
  targetRole: 'client' | 'helper',
): ServiceReview[] {
  const expected = expectedReviewerRole(targetRole);
  return reviews.filter(
    (r) =>
      r.targetUserId === targetUserId &&
      (r.reviewerRole === expected || (r.reviewerRole == null && r.reviewerId !== targetUserId)),
  );
}

export function buildCriteriaAveragesFromReviews(
  reviews: ServiceReview[],
  targetRole: 'client' | 'helper',
): Partial<Record<ReviewCriterionKey, number>> {
  const allowed = targetRole === 'helper' ? CLIENT_CRITERIA_KEYS : HELPER_CRITERIA_KEYS;
  const sums = new Map<ReviewCriterionKey, { total: number; count: number }>();

  for (const review of reviews) {
    if (!review.criteriaScores) continue;
    for (const [key, value] of Object.entries(review.criteriaScores)) {
      if (!allowed.has(key as ReviewCriterionKey) || value < 1 || value > 5) continue;
      const criterion = key as ReviewCriterionKey;
      const prev = sums.get(criterion) ?? { total: 0, count: 0 };
      sums.set(criterion, { total: prev.total + value, count: prev.count + 1 });
    }
  }

  const out: Partial<Record<ReviewCriterionKey, number>> = {};
  for (const [key, { total, count }] of sums) {
    if (count > 0) out[key] = Math.round((total / count) * 10) / 10;
  }
  return out;
}

export function mapRecentReviews(reviews: ServiceReview[]): PublicReputationReview[] {
  return reviews
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5)
    .map((r) => ({
      rating: r.rating,
      comment: r.comment?.trim() || null,
      createdAt: r.createdAt,
      reviewerRole: r.reviewerRole,
    }));
}

export function parseReputationDossierRpc(
  userId: string,
  payload: ReputationDossierRpcPayload | null | undefined,
): Omit<PublicReputationDossier, 'loading'> | null {
  if (!payload?.role || (payload.role !== 'client' && payload.role !== 'helper')) return null;

  const role = payload.role;
  const completedCount = payload.completedCount ?? 0;
  const averageRating = Number(payload.averageRating ?? 0);
  const reviewCount = payload.reviewCount ?? 0;
  const memberSince = payload.memberSince ? new Date(payload.memberSince).getTime() : null;

  const input: ReputationInput = { completedCount, averageRating };
  const rank = hasRankableStats(input) || reviewCount > 0
    ? role === 'helper'
      ? getHelperRank(input)
      : getClientRank(input)
    : null;

  const criteriaAverages = Object.fromEntries(
    Object.entries(payload.criteriaAverages ?? {}).filter(([key]) =>
      role === 'helper' ? CLIENT_CRITERIA_KEYS.has(key as ReviewCriterionKey) : HELPER_CRITERIA_KEYS.has(key as ReviewCriterionKey),
    ),
  ) as Partial<Record<ReviewCriterionKey, number>>;

  const recentReviews: PublicReputationReview[] = (payload.recentReviews ?? []).map((r) => ({
    rating: Number(r.rating ?? 0),
    comment: r.comment?.trim() || null,
    createdAt: r.createdAt ? new Date(r.createdAt).getTime() : Date.now(),
    reviewerRole:
      r.reviewerRole === 'client' || r.reviewerRole === 'helper' ? r.reviewerRole : null,
  }));

  return {
    userId,
    role,
    completedCount,
    publishedCount: role === 'client' ? (payload.publishedCount ?? null) : null,
    averageRating,
    reviewCount,
    memberSince,
    trustScore: computeTrustScore(completedCount, averageRating, reviewCount),
    rank,
    criteriaAverages,
    recentReviews,
    source: 'rpc',
  };
}

export function buildLocalReputationDossier(input: {
  userId: string;
  role: 'client' | 'helper';
  reviews: ServiceReview[];
  completedCount: number;
  publishedCount?: number | null;
  averageRating?: number | null;
  memberSince?: number | null;
}): Omit<PublicReputationDossier, 'loading'> {
  const relevantReviews = filterReviewsForTarget(input.reviews, input.userId, input.role);
  const reviewCount = relevantReviews.length;
  const averageRating =
    input.averageRating != null && input.averageRating > 0
      ? input.averageRating
      : reviewCount > 0
        ? Math.round((relevantReviews.reduce((s, r) => s + r.rating, 0) / reviewCount) * 100) / 100
        : 0;

  const reputationInput: ReputationInput = {
    completedCount: input.completedCount,
    averageRating,
  };

  const rank =
    hasRankableStats(reputationInput) || reviewCount > 0
      ? input.role === 'helper'
        ? getHelperRank(reputationInput)
        : getClientRank(reputationInput)
      : null;

  return {
    userId: input.userId,
    role: input.role,
    completedCount: input.completedCount,
    publishedCount: input.role === 'client' ? (input.publishedCount ?? null) : null,
    averageRating,
    reviewCount,
    memberSince: input.memberSince ?? null,
    trustScore: computeTrustScore(input.completedCount, averageRating, reviewCount),
    rank,
    criteriaAverages: buildCriteriaAveragesFromReviews(relevantReviews, input.role),
    recentReviews: mapRecentReviews(relevantReviews),
    source: 'local',
  };
}

export function mergeReputationDossiers(
  rpc: Omit<PublicReputationDossier, 'loading'> | null,
  local: Omit<PublicReputationDossier, 'loading'>,
): Omit<PublicReputationDossier, 'loading'> {
  if (!rpc) return local;

  const criteriaAverages =
    Object.keys(rpc.criteriaAverages).length > 0 ? rpc.criteriaAverages : local.criteriaAverages;
  const recentReviews = rpc.recentReviews.length > 0 ? rpc.recentReviews : local.recentReviews;

  return {
    ...rpc,
    criteriaAverages,
    recentReviews,
    reviewCount: Math.max(rpc.reviewCount, local.reviewCount),
    averageRating: rpc.averageRating > 0 ? rpc.averageRating : local.averageRating,
    completedCount: rpc.completedCount > 0 ? rpc.completedCount : local.completedCount,
    publishedCount: rpc.publishedCount ?? local.publishedCount,
    memberSince: rpc.memberSince ?? local.memberSince,
    trustScore: computeTrustScore(
      rpc.completedCount > 0 ? rpc.completedCount : local.completedCount,
      rpc.averageRating > 0 ? rpc.averageRating : local.averageRating,
      Math.max(rpc.reviewCount, local.reviewCount),
    ),
    rank: rpc.rank ?? local.rank,
    source: 'mixed',
  };
}

export function criteriaConfigForTargetRole(role: 'client' | 'helper') {
  return role === 'helper' ? CLIENT_REVIEW_HELPER_CRITERIA : HELPER_REVIEW_CLIENT_CRITERIA;
}
