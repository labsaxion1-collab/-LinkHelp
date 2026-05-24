import { getSupabase } from '@/lib/supabase';

export async function confirmInitialProfileRole(role: 'client' | 'helper'): Promise<{ ok: true } | { ok: false; message: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: 'NO_SUPABASE' };

  const { data, error } = await sb.rpc('confirm_initial_profile_role', { p_role: role });
  if (error) {
    return { ok: false, message: error.message };
  }
  if (!data) {
    return { ok: false, message: 'CONFIRM_FAILED' };
  }
  return { ok: true };
}
