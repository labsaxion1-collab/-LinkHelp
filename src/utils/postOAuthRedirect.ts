import type { User } from '@supabase/supabase-js';
import type { AuthProfile } from '@/context/AuthContext';
import { ROUTES } from '@/utils/constants';

/**
 * After Google OAuth + PKCE, pick workspace entry.
 * - Explicit helper/client from user_metadata or profile → /helper or /client
 * - No metadata and no profile row yet → /dashboard (gate retries profile + role)
 */
export function resolvePostOAuthPath(profile: AuthProfile | null, user: User): string {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const raw = typeof meta.user_type === 'string' ? meta.user_type.trim() : '';
  const explicitRole = raw === 'helper' || raw === 'client' ? raw : null;

  if (profile?.role === 'helper') return ROUTES.helperDashboard;
  if (profile?.role === 'client') return ROUTES.clientDashboard;

  if (explicitRole === 'helper') return ROUTES.helperDashboard;
  if (explicitRole === 'client') return ROUTES.clientDashboard;

  if (!profile) return ROUTES.dashboard;

  return ROUTES.clientHome;
}
