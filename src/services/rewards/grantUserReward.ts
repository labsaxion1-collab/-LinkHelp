import type { RewardType } from '@/config/onboardingRewards';
import { rewardAmountForType } from '@/config/onboardingRewards';
import { getSupabase } from '@/lib/supabase';
import { remoteGrantUserReward } from '@/services/supabase/rewardsRemote';
import type { GrantUserRewardResult } from '@/types/rewards';

const localGrantedKey = (userId: string) => `linkhelp_bonus_rewards_${userId}`;

function readLocalGranted(userId: string): Set<RewardType> {
  try {
    const raw = localStorage.getItem(localGrantedKey(userId));
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as RewardType[];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

function writeLocalGranted(userId: string, types: Set<RewardType>) {
  localStorage.setItem(localGrantedKey(userId), JSON.stringify([...types]));
}

/**
 * Grants a one-time LinkCredits reward (server RPC when Supabase is configured).
 * Safe against duplicate grants via `user_bonus_rewards` unique constraint.
 */
export async function grantUserReward(
  userId: string,
  rewardType: RewardType,
  options?: { description?: string; localBalanceRef?: { value: number } },
): Promise<GrantUserRewardResult> {
  const sb = getSupabase();
  if (!sb) {
    if (options?.localBalanceRef) {
      return grantUserRewardLocal(userId, rewardType, options.localBalanceRef);
    }
    return { granted: false, reason: 'NO_SUPABASE' };
  }

  try {
    const result = await remoteGrantUserReward(userId, rewardType, options?.description);
    if (import.meta.env.DEV) {
      console.info('[LinkHelp] grantUserReward', { rewardType, ...result });
    }
    return result;
  } catch (e) {
    if (import.meta.env.DEV) {
      console.error('[LinkHelp] grantUserReward error', rewardType, e);
    }
    return { granted: false, reason: 'RPC_FAILED' };
  }
}

/** Offline/demo fallback when Supabase RPC is unavailable. */
export function grantUserRewardLocal(
  userId: string,
  rewardType: RewardType,
  balanceRef: { value: number },
): GrantUserRewardResult {
  const granted = readLocalGranted(userId);
  if (granted.has(rewardType)) {
    return { granted: false, reason: 'ALREADY_GRANTED', rewardType };
  }
  const amount = rewardAmountForType(rewardType);
  granted.add(rewardType);
  writeLocalGranted(userId, granted);
  balanceRef.value += amount;
  return { granted: true, rewardType, amount, balanceAfter: balanceRef.value };
}
