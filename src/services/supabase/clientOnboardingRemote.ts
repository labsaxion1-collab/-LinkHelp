import { getSupabase } from '@/lib/supabase';
import type { CompleteClientOnboardingResult } from '@/types/clientOnboarding';

function parseCompleteResult(data: unknown): CompleteClientOnboardingResult {
  if (!data || typeof data !== 'object') return { granted: false, reason: 'INVALID_RESPONSE' };
  const o = data as Record<string, unknown>;
  return {
    granted: Boolean(o.granted),
    reason: typeof o.reason === 'string' ? o.reason : undefined,
    rewardType: o.reward_type === 'CLIENT_WELCOME_30' ? 'CLIENT_WELCOME_30' : undefined,
    amount: typeof o.amount === 'number' ? o.amount : undefined,
    balanceAfter: typeof o.balance_after === 'number' ? o.balance_after : undefined,
    completedAt: typeof o.completed_at === 'string' ? o.completed_at : undefined,
  };
}

export async function remoteCompleteClientOnboarding(
  clientId: string,
  deviceFingerprint?: string | null,
): Promise<CompleteClientOnboardingResult> {
  const sb = getSupabase();
  if (!sb) return { granted: false, reason: 'NO_SUPABASE' };

  const { data, error } = await sb.rpc('complete_client_onboarding', {
    p_client_id: clientId,
    p_device_fingerprint: deviceFingerprint ?? null,
  });

  if (error) {
    if (import.meta.env.DEV) {
      console.error('[LinkHelp] complete_client_onboarding failed', {
        code: error.code,
        message: error.message,
      });
    }
    throw error;
  }

  return parseCompleteResult(data);
}
