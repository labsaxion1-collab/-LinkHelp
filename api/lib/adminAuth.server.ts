import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createSupabaseAuthVerifier } from './supabaseAdmin.server.js';

export type AdminAuthorization =
  | { ok: true; user: User }
  | { ok: false; status: 401 | 403; error: 'UNAUTHORIZED' | 'FORBIDDEN' };

export function extractBearerToken(header: string | undefined): string | null {
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

export async function authorizeAdmin(
  authorizationHeader: string | undefined,
  verifier: Pick<SupabaseClient, 'auth'> = createSupabaseAuthVerifier(),
): Promise<AdminAuthorization> {
  const token = extractBearerToken(authorizationHeader);
  if (!token) return { ok: false, status: 401, error: 'UNAUTHORIZED' };
  const { data, error } = await verifier.auth.getUser(token);
  if (error || !data.user) return { ok: false, status: 401, error: 'UNAUTHORIZED' };
  if (data.user.app_metadata?.role !== 'admin') {
    return { ok: false, status: 403, error: 'FORBIDDEN' };
  }
  return { ok: true, user: data.user };
}
