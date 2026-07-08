import { describe, expect, it } from 'vitest';
import {
  buildCriteriaAveragesFromReviews,
  buildLocalReputationDossier,
  computeTrustScore,
  parseReputationDossierRpc,
} from '@/utils/reputationDossier';
import type { ServiceReview } from '@/types/review';

const review = (partial: Partial<ServiceReview> & Pick<ServiceReview, 'targetUserId' | 'reviewerId'>): ServiceReview => ({
  id: 'r1',
  requestId: 'req-1',
  rating: 5,
  comment: 'Great',
  criteriaScores: null,
  reviewerRole: 'client',
  createdAt: Date.now(),
  ...partial,
});

describe('reputationDossier', () => {
  it('computes trust score from real counts', () => {
    expect(computeTrustScore(10, 4.5, 8)).toBeGreaterThan(0);
    expect(computeTrustScore(0, 0, 0)).toBe(0);
  });

  it('builds criteria averages for helper target', () => {
    const averages = buildCriteriaAveragesFromReviews(
      [
        review({
          targetUserId: 'helper-1',
          reviewerId: 'client-1',
          reviewerRole: 'client',
          criteriaScores: {
            service_quality: 5,
            punctuality: 4,
            communication: 5,
            professionalism: 4,
            recommend: 5,
          },
        }),
      ],
      'helper',
    );
    expect(averages.service_quality).toBe(5);
    expect(averages.punctuality).toBe(4);
  });

  it('parses RPC payload', () => {
    const parsed = parseReputationDossierRpc('helper-1', {
      role: 'helper',
      completedCount: 12,
      averageRating: 4.7,
      reviewCount: 9,
      memberSince: '2024-01-15T00:00:00.000Z',
      criteriaAverages: { service_quality: 4.8 },
      recentReviews: [{ rating: 5, comment: 'Excelente', createdAt: '2025-06-01T00:00:00.000Z', reviewerRole: 'client' }],
    });
    expect(parsed?.completedCount).toBe(12);
    expect(parsed?.criteriaAverages.service_quality).toBe(4.8);
    expect(parsed?.recentReviews).toHaveLength(1);
  });

  it('builds local dossier without RPC', () => {
    const dossier = buildLocalReputationDossier({
      userId: 'client-1',
      role: 'client',
      reviews: [
        review({
          targetUserId: 'client-1',
          reviewerId: 'helper-1',
          reviewerRole: 'helper',
          criteriaScores: { communication: 4, payment: 5, punctuality: 4, respect: 5, clarity: 4 },
        }),
      ],
      completedCount: 3,
      publishedCount: 5,
      averageRating: 4.6,
    });
    expect(dossier.reviewCount).toBe(1);
    expect(dossier.publishedCount).toBe(5);
    expect(dossier.criteriaAverages.payment).toBe(5);
  });
});
