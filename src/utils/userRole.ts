import { roleFromAuthMetadata, roleRoutingLog } from '@/lib/authDebug';
import { ROUTES } from '@/utils/constants';
import { isClientArea, isHelperArea } from '@/utils/navigation';
import type { ProfileRole } from '@/types/database';
import type { AppMode } from '@/utils/appModeStorage';
import type { User } from '@supabase/supabase-js';

/** Canonical role values used across auth metadata (`user_type`) and `profiles.role`. */
export function normalizeProfileRole(raw: unknown): ProfileRole {
  if (raw === 'helper') return 'helper';
  return 'client';
}

/** Resolve workspace role — profile row wins when present; stored mode only before profile loads. */
export function resolveEffectiveRole(
  profile: { role?: unknown } | null | undefined,
  user?: User | null,
  storedMode?: AppMode | null,
): ProfileRole {
  const roleFromAuth = roleFromAuthMetadata(user);

  if (profile?.deleted_at) {
    return 'client';
  }

  if (profile?.role === 'helper' || profile?.role === 'client') {
    const profileRole = normalizeProfileRole(profile.role);
    if (storedMode && storedMode !== profileRole) {
      roleRoutingLog('resolveEffectiveRole:stored_mode_overridden_by_profile', {
        userId: user?.id ?? null,
        email: user?.email ?? null,
        role_from_profile: profile.role,
        role_from_auth: roleFromAuth,
        stored_mode: storedMode,
        effective_role: profileRole,
      });
    }
    return profileRole;
  }

  if (storedMode === 'client' || storedMode === 'helper') return storedMode;

  if (roleFromAuth === 'helper' || roleFromAuth === 'client') return normalizeProfileRole(roleFromAuth);
  return 'client';
}

export function dashboardPathForRole(role: ProfileRole | string | undefined | null): string {
  return role === 'helper' ? ROUTES.helperDashboard : ROUTES.clientDashboard;
}

export function homePathForRole(role: ProfileRole | string | undefined | null): string {
  return role === 'helper' ? ROUTES.helperHome : ROUTES.clientHome;
}

/** Whether an authenticated user with this role may open the path. */
export function isPathAllowedForRole(pathname: string, role: ProfileRole): boolean {
  if (isHelperArea(pathname)) return role === 'helper';
  if (isClientArea(pathname)) return role === 'client';
  if (pathname === ROUTES.payments || pathname.startsWith(`${ROUTES.payments}/`)) return role === 'client';
  if (pathname === ROUTES.ideas || pathname.startsWith(`${ROUTES.ideas}/`)) return role === 'client';
  if (pathname === ROUTES.helperCredits || pathname.startsWith(`${ROUTES.helperCredits}/`)) return role === 'helper';
  if (pathname === ROUTES.helperLinkCredits || pathname.startsWith(`${ROUTES.helperLinkCredits}/`)) return role === 'helper';
  if (pathname === ROUTES.helperTraining || pathname.startsWith(`${ROUTES.helperTraining}/`)) return role === 'helper';
  return true;
}

export function resolvePostLoginPath(
  profileRole: ProfileRole,
  fromPath?: string | null,
): string {
  if (fromPath && fromPath !== ROUTES.login && fromPath.startsWith('/') && !fromPath.startsWith('//')) {
    if (isPathAllowedForRole(fromPath, profileRole)) return fromPath;
  }
  return homePathForRole(profileRole);
}
