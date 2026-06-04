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

/** Resolve the active workspace mode — stored preference wins, then profile, then metadata, default client. */
export function resolveEffectiveRole(
  profile: { role?: unknown } | null | undefined,
  user?: User | null,
  storedMode?: AppMode | null,
): ProfileRole {
  if (storedMode === 'client' || storedMode === 'helper') return storedMode;
  if (profile?.role === 'helper' || profile?.role === 'client') {
    return normalizeProfileRole(profile.role);
  }
  const metaType = user?.user_metadata?.user_type;
  if (metaType === 'helper' || metaType === 'client') return normalizeProfileRole(metaType);
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
