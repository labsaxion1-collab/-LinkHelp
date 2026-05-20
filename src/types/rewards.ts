import type { RewardType } from '@/config/onboardingRewards';

export type UserBonusRewardRow = {
  id: string;
  userId: string;
  rewardType: RewardType;
  amount: number;
  createdAt: number;
};

export type GrantUserRewardResult = {
  granted: boolean;
  rewardType?: RewardType;
  amount?: number;
  balanceAfter?: number;
  reason?: 'ALREADY_GRANTED' | string;
};
