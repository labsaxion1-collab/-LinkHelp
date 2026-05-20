import { getSupabase } from '@/lib/supabase';
import type { RewardType } from '@/config/onboardingRewards';
import type { GrantUserRewardResult, UserBonusRewardRow } from '@/types/rewards';

function rowFromDb(row: Record<string, unknown>): UserBonusRewardRow {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    rewardType: row.reward_type as RewardType,
    amount: Number(row.amount ?? 0),
    createdAt: row.created_at ? new Date(row.created_at as string).getTime() : Date.now(),
  };
}

function parseGrantResult(data: unknown): GrantUserRewardResult {
  if (!data || typeof data !== 'object') return { granted: false, reason: 'INVALID_RESPONSE' };
  const o = data as Record<string, unknown>;
  return {
    granted: Boolean(o.granted),
    rewardType: o.reward_type as RewardType | undefined,
    amount: typeof o.amount === 'number' ? o.amount : undefined,
    balanceAfter: typeof o.balance_after === 'number' ? o.balance_after : undefined,
    reason: typeof o.reason === 'string' ? o.reason : undefined,
  };
}

export async function fetchUserBonusRewards(userId: string): Promise<UserBonusRewardRow[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from('user_bonus_rewards')
    .select('id, user_id, reward_type, amount, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    if (import.meta.env.DEV) console.warn('[LinkHelp] fetchUserBonusRewards', error.message);
    return [];
  }
  return (data ?? []).map((r) => rowFromDb(r as Record<string, unknown>));
}

export async function remoteGrantUserReward(
  userId: string,
  rewardType: RewardType,
  description?: string,
): Promise<GrantUserRewardResult> {
  const sb = getSupabase();
  if (!sb) return { granted: false, reason: 'NO_SUPABASE' };

  const { data, error } = await sb.rpc('grant_user_reward', {
    p_user_id: userId,
    p_reward_type: rewardType,
    p_amount: null,
    p_description: description ?? null,
  });

  if (error) {
    if (import.meta.env.DEV) {
      console.error('[LinkHelp] grant_user_reward failed', {
        code: error.code,
        message: error.message,
        rewardType,
      });
    }
    throw error;
  }

  return parseGrantResult(data);
}

/** Ensures signup bonus exists (idempotent). */
export async function remoteEnsureSignupCredits(
  userId: string,
  role: 'client' | 'helper',
): Promise<number> {
  const sb = getSupabase();
  if (!sb) return 0;

  if (role === 'helper') {
    await sb.rpc('ensure_helper_credit_wallet', { p_helper_id: userId });
    const { data, error } = await sb.rpc('get_wallet_balance', { p_helper_id: userId });
    if (error) throw error;
    return typeof data === 'number' ? data : 0;
  }

  const { data, error } = await sb.rpc('ensure_client_signup_credits', { p_client_id: userId });
  if (error) throw error;
  return typeof data === 'number' ? data : 0;
}
