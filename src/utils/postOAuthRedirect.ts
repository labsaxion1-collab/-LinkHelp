import type { User } from '@supabase/supabase-js';
import type { AuthProfile } from '@/context/AuthContext';
import { roleFromAuthMetadata, roleRoutingLog } from '@/lib/authDebug';
import { ROUTES } from '@/utils/constants';
import { dashboardPathForRole, normalizeProfileRole } from '@/utils/userRole';

/**
 * After Google OAuth + PKCE, pick workspace entry.
 * - Explicit helper/client from user_metadata or profile → /helper or /client
 * - No metadata and no profile row yet → /dashboard (gate retries profile + role)
 */
export function resolvePostOAuthPath(profile: AuthProfile | null, user: User): string {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const raw = typeof meta.user_type === 'string' ? meta.user_type.trim() : '';
  const explicitRole = raw === 'helper' || raw === 'client' ? raw : null;
  const roleFromAuth = roleFromAuthMetadata(user);

  if (profile?.role === 'helper') {
    if (explicitRole && explicitRole !== 'helper') {
      roleRoutingLog('resolvePostOAuthPath:auth_metadata_ignored', {
        userId: user.id,
        email: user.email ?? null,
        role_from_profile: profile.role,
        role_from_auth: roleFromAuth,
        redirect_destination: ROUTES.helperDashboard,
      });
    }
    return ROUTES.helperDashboard;
  }
  if (profile?.role === 'client') return ROUTES.clientDashboard;

  if (explicitRole === 'helper') return ROUTES.helperDashboard;
  if (explicitRole === 'client') return ROUTES.clientDashboard;

  if (!profile) return ROUTES.dashboard;

  return dashboardPathForRole(normalizeProfileRole(profile.role));
}
