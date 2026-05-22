/** Frontend-only helper score structure — wire to backend later. */

export const HELPER_SCORE_CATEGORIES = [
  { id: 'punctuality', labelKey: 'helper_score.cat_punctuality' },
  { id: 'organization', labelKey: 'helper_score.cat_organization' },
  { id: 'cleanliness', labelKey: 'helper_score.cat_cleanliness' },
  { id: 'communication', labelKey: 'helper_score.cat_communication' },
  { id: 'trust', labelKey: 'helper_score.cat_trust' },
] as const;

export type HelperScoreCategoryId = (typeof HELPER_SCORE_CATEGORIES)[number]['id'];

export const MOCK_HELPER_SCORE = {
  overall: 4.7,
  evolutionDelta: '+0.2',
  trendLabel: '30d',
  categories: {
    punctuality: 4.9,
    organization: 4.6,
    cleanliness: 4.8,
    communication: 4.5,
    trust: 4.7,
  } as Record<HelperScoreCategoryId, number>,
  feedback: [
    { id: '1', tone: 'positive' as const, messageKey: 'helper_score.feedback_punctual' },
    { id: '2', tone: 'negative' as const, messageKey: 'helper_score.feedback_response' },
  ],
};
