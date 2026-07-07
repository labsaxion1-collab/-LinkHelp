import { getSupabase } from '@/lib/supabase';
import { requestGamificationRecalculate } from '@/gamification/services/gamificationApiClient';
import type { UserType } from '@/gamification/types/gamification';

export type GamificationTriggerReason =
  | 'request_published'
  | 'request_cancelled'
  | 'service_completed'
  | 'application_submitted'
  | 'review_received'
  | 'profile_updated'
  | 'message_responded'
  | 'complaint_confirmed';

async function resolveCurrentUserType(): Promise<UserType | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const {
    data: { session },
  } = await sb.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return null;

  const { data, error } = await sb.from('profiles').select('role').eq('id', userId).maybeSingle();
  if (error || !data?.role) return null;
  return data.role === 'helper' ? 'helper' : 'client';
}

/** Papel do usuário avaliado após uma review. */
export function resolveReviewTargetUserType(
  reviewerRole?: 'client' | 'helper' | null,
): UserType {
  return reviewerRole === 'client' ? 'helper' : 'client';
}

/**
 * Dispara recálculo via POST /api/gamification/recalculate.
 * Fire-and-forget: falhas só logam; nunca bloqueiam a UX.
 *
 * @param reason — opcional, apenas para log/diagnóstico
 * @param userType — quando omitido, usa o role do usuário autenticado
 */
export function triggerGamificationRecalculate(
  reason?: GamificationTriggerReason,
  userType?: UserType,
): void {
  void (async () => {
    try {
      const resolvedType = userType ?? (await resolveCurrentUserType());
      if (!resolvedType) return;

      if (import.meta.env.DEV && reason) {
        console.info('[gamification] recalculate', reason, resolvedType);
      }

      await requestGamificationRecalculate(resolvedType);
    } catch (error) {
      console.warn(
        '[gamification] recalculate failed',
        reason ?? 'unknown',
        error instanceof Error ? error.message : error,
      );
    }
  })();
}
