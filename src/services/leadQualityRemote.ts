import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

/** Ask DB to recompute internal lead_quality_score for a request. */
export async function refreshRequestLeadQuality(requestId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.rpc('refresh_request_lead_quality', { p_request_id: requestId });
  if (error && import.meta.env.DEV) {
    console.warn('[LinkHelp] refresh_request_lead_quality skipped', error.message);
  }
}
