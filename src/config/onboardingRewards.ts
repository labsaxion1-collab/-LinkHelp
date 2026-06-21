/**
 * Central onboarding / action rewards for LinkCredits (LC).
 * Extend with promos, missions, streaks, referral campaigns.
 */

export type RewardType =
  | 'SIGNUP_CLIENT'
  | 'SIGNUP_HELPER'
  | 'CLIENT_WELCOME_30'
  | 'PROFILE_PHOTO'
  | 'PROFILE_DESCRIPTION'
  | 'PROFILE_SKILLS'
  | 'PHONE_VERIFIED'
  | 'FIRST_REQUEST_CREATED'
  | 'FIRST_APPLICATION_SENT'
  | 'FIRST_REVIEW_RECEIVED'
  | 'REFERRAL_COMPLETED';

export const SIGNUP_BONUS_LC = {
  /** Clients do not receive signup LC (boosts only, future). */
  client: 0,
  /** Helpers receive a one-time welcome balance at signup only. */
  helper: 20,
} as const;

/** Legacy action rewards — profile completion no longer grants LC. */
export const ACTION_REWARD_LC: Record<
  Exclude<RewardType, 'SIGNUP_CLIENT' | 'SIGNUP_HELPER' | 'CLIENT_WELCOME_30'>,
  number
> = {
  PROFILE_PHOTO: 0,
  PROFILE_DESCRIPTION: 0,
  PROFILE_SKILLS: 0,
  PHONE_VERIFIED: 0,
  FIRST_REQUEST_CREATED: 5,
  FIRST_APPLICATION_SENT: 5,
  FIRST_REVIEW_RECEIVED: 3,
  REFERRAL_COMPLETED: 10,
};

/** One-time welcome bonus after client onboarding carousel. */
export const CLIENT_WELCOME_30_LC = 30;

export function rewardAmountForType(type: RewardType): number {
  if (type === 'SIGNUP_CLIENT') return SIGNUP_BONUS_LC.client;
  if (type === 'SIGNUP_HELPER') return SIGNUP_BONUS_LC.helper;
  if (type === 'CLIENT_WELCOME_30') return CLIENT_WELCOME_30_LC;
  return ACTION_REWARD_LC[type as Exclude<RewardType, 'SIGNUP_CLIENT' | 'SIGNUP_HELPER' | 'CLIENT_WELCOME_30'>];
}

/** Profile checklist items shown in progress UI (excludes signup / transactional rewards). */
export type ProfileRewardCheckId =
  | 'PROFILE_PHOTO'
  | 'PROFILE_DESCRIPTION'
  | 'PROFILE_SKILLS'
  | 'PHONE_VERIFIED';

/** Profile completion no longer grants credits — kept empty for legacy UI hooks. */
export const PROFILE_REWARD_CHECKS: {
  id: ProfileRewardCheckId;
  rewardType: ProfileRewardCheckId;
  labelKey: string;
  hintKey: string;
}[] = [];

/** Future: daily streak, promo events, referral milestones. */
export const FUTURE_REWARD_CHANNELS = {
  promotionalEvents: true,
  missions: true,
  dailyStreak: true,
  referralSystem: true,
} as const;
