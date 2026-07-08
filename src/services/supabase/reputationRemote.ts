import { getSupabase } from '@/lib/supabase';
import type { ReputationDossierRpcPayload } from '@/utils/reputationDossier';
import { isPostgrestMissingResource } from '@/utils/postgrestErrors';

export async function remoteFetchPublicReputationDossier(
  userId: string,
): Promise<ReputationDossierRpcPayload | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const { data, error } = await sb.rpc('get_public_reputation_dossier', {
    p_user_id: userId,
  });

  if (!error && data && typeof data === 'object') {
    return data as ReputationDossierRpcPayload;
  }

  if (error && !isPostgrestMissingResource(error)) {
    console.warn('[LinkHelp] get_public_reputation_dossier', error.message);
  }

  const { data: legacy, error: legacyErr } = await sb.rpc('get_user_reputation_stats', {
    p_user_id: userId,
  });

  if (legacyErr) {
    console.warn('[LinkHelp] get_user_reputation_stats', legacyErr.message);
    return null;
  }

  if (!legacy || typeof legacy !== 'object') return null;

  const row = legacy as ReputationDossierRpcPayload;
  const { data: profile } = await sb
    .from('profiles')
    .select('created_at')
    .eq('id', userId)
    .maybeSingle();

  return {
    ...row,
    memberSince: (profile as { created_at?: string } | null)?.created_at ?? row.memberSince,
    reviewCount: row.reviewCount ?? 0,
    criteriaAverages: row.criteriaAverages ?? {},
    recentReviews: row.recentReviews ?? [],
  };
}
