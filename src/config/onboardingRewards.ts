/**
 * Central onboarding / action rewards for LinkCredits (LC).
 * Extend with promos, missions, streaks, referral campaigns.
 */

export type RewardType =
  | 'SIGNUP_CLIENT'
  | 'SIGNUP_HELPER'
  | 'PROFILE_PHOTO'
  | 'PROFILE_DESCRIPTION'
  | 'PROFILE_SKILLS'
  | 'PHONE_VERIFIED'
  | 'FIRST_REQUEST_CREATED'
  | 'FIRST_APPLICATION_SENT'
  | 'FIRST_REVIEW_RECEIVED'
  | 'REFERRAL_COMPLETED';

export const SIGNUP_BONUS_LC = {
  client: 12_000,
  helper: 25_000,
} as const;

/** One-time action rewards (LC). */
export const ACTION_REWARD_LC: Record<Exclude<RewardType, 'SIGNUP_CLIENT' | 'SIGNUP_HELPER'>, number> = {
  PROFILE_PHOTO: 2_000,
  PROFILE_DESCRIPTION: 1_000,
  PROFILE_SKILLS: 2_000,
  PHONE_VERIFIED: 3_000,
  FIRST_REQUEST_CREATED: 5_000,
  FIRST_APPLICATION_SENT: 5_000,
  FIRST_REVIEW_RECEIVED: 3_000,
  REFERRAL_COMPLETED: 10_000,
};

export function rewardAmountForType(type: RewardType): number {
  if (type === 'SIGNUP_CLIENT') return SIGNUP_BONUS_LC.client;
  if (type === 'SIGNUP_HELPER') return SIGNUP_BONUS_LC.helper;
  return ACTION_REWARD_LC[type];
}

/** Profile checklist items shown in progress UI (excludes signup / transactional rewards). */
export type ProfileRewardCheckId =
  | 'PROFILE_PHOTO'
  | 'PROFILE_DESCRIPTION'
  | 'PROFILE_SKILLS'
  | 'PHONE_VERIFIED';

export const PROFILE_REWARD_CHECKS: {
  id: ProfileRewardCheckId;
  rewardType: ProfileRewardCheckId;
  labelKey: string;
  hintKey: string;
}[] = [
  {
    id: 'PROFILE_PHOTO',
    rewardType: 'PROFILE_PHOTO',
    labelKey: 'rewards.check_photo',
    hintKey: 'rewards.check_photo_hint',
  },
  {
    id: 'PROFILE_DESCRIPTION',
    rewardType: 'PROFILE_DESCRIPTION',
    labelKey: 'rewards.check_bio',
    hintKey: 'rewards.check_bio_hint',
  },
  {
    id: 'PROFILE_SKILLS',
    rewardType: 'PROFILE_SKILLS',
    labelKey: 'rewards.check_skills',
    hintKey: 'rewards.check_skills_hint',
  },
  {
    id: 'PHONE_VERIFIED',
    rewardType: 'PHONE_VERIFIED',
    labelKey: 'rewards.check_phone',
    hintKey: 'rewards.check_phone_hint',
  },
];

/** Future: daily streak, promo events, referral milestones. */
export const FUTURE_REWARD_CHANNELS = {
  promotionalEvents: true,
  missions: true,
  dailyStreak: true,
  referralSystem: true,
} as const;
