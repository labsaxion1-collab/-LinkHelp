export type ReviewCriterionKey =
  | 'communication'
  | 'punctuality'
  | 'respect'
  | 'clarity'
  | 'payment'
  | 'service_quality'
  | 'professionalism'
  | 'recommend';

export type ReviewCriteriaConfig = {
  key: ReviewCriterionKey;
  labelKey: string;
};

export const HELPER_REVIEW_CLIENT_CRITERIA: ReviewCriteriaConfig[] = [
  { key: 'communication', labelKey: 'service_review.criteria.communication' },
  { key: 'punctuality', labelKey: 'service_review.criteria.punctuality' },
  { key: 'respect', labelKey: 'service_review.criteria.respect' },
  { key: 'clarity', labelKey: 'service_review.criteria.clarity' },
  { key: 'payment', labelKey: 'service_review.criteria.payment' },
];

export const CLIENT_REVIEW_HELPER_CRITERIA: ReviewCriteriaConfig[] = [
  { key: 'service_quality', labelKey: 'service_review.criteria.service_quality' },
  { key: 'punctuality', labelKey: 'service_review.criteria.punctuality' },
  { key: 'communication', labelKey: 'service_review.criteria.communication' },
  { key: 'professionalism', labelKey: 'service_review.criteria.professionalism' },
  { key: 'recommend', labelKey: 'service_review.criteria.recommend' },
];

export function averageCriteriaScores(scores: Record<string, number>): number {
  const values = Object.values(scores).filter((v) => v >= 1 && v <= 5);
  if (values.length === 0) return 0;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round((sum / values.length) * 10) / 10;
}

export function criteriaForRole(role: 'client' | 'helper'): ReviewCriteriaConfig[] {
  return role === 'helper' ? HELPER_REVIEW_CLIENT_CRITERIA : CLIENT_REVIEW_HELPER_CRITERIA;
}
