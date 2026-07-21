import type { Session } from '@supabase/supabase-js';
import { isFluxAdmin } from '@/utils/adminAccess';
import { ROUTES } from '@/utils/constants';
import { FLUX_HOSTNAME, isAdminRoute, isFluxHost, LINKHELP_PUBLIC_ORIGIN } from '@/utils/fluxHost';
import type { ProfileRole } from '@/types/database';
import { dashboardPathForRole, isPathAllowedForRole } from '@/utils/userRole';

const BLOCKED_RETURN_PREFIXES = ['//', 'http://', 'https://', 'javascript:', 'data:'];

/**
 * Accept only same-app relative paths (pathname + optional search).
 * Rejects open redirects and cross-origin URLs.
 */
export function sanitizeReturnTo(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return null;
  const lower = trimmed.toLowerCase();
  for (const blocked of BLOCKED_RETURN_PREFIXES) {
    if (lower.startsWith(blocked)) return null;
  }
  try {
    const parsed = new URL(trimmed, 'https://local.invalid');
    if (parsed.origin !== 'https://local.invalid') return null;
    const path = `${parsed.pathname}${parsed.search}`;
    if (!path.startsWith('/') || path.startsWith('//')) return null;
    return path;
  } catch {
    return null;
  }
}

export function readReturnToFromLocation(search: string, stateFrom?: string | null): string | null {
  const params = new URLSearchParams(search);
  const fromQuery = sanitizeReturnTo(params.get('returnTo'));
  if (fromQuery) return fromQuery;
  return sanitizeReturnTo(stateFrom);
}

export type PostLoginDestinationInput = {
  hostname?: string;
  profileRole: ProfileRole;
  session: Session | null;
  returnTo?: string | null;
};

/**
 * Post-auth navigation — preserves Preview/FLUX origin via relative paths only.
 */
export function getPostLoginDestination(input: PostLoginDestinationInput): string {
  const { profileRole, session, returnTo, hostname } = input;
  const flux = isFluxHost(hostname);
  const adminUser = isFluxAdmin(session);
  const safeReturn = sanitizeReturnTo(returnTo);

  if (safeReturn && isAdminRoute(safeReturn)) {
    if (adminUser) return safeReturn;
    if (flux) return ROUTES.fluxAccessDenied;
    return dashboardPathForRole(profileRole);
  }

  if (flux) {
    if (adminUser) return ROUTES.adminDashboard;
    return ROUTES.fluxAccessDenied;
  }

  if (adminUser && safeReturn && isAdminRoute(safeReturn)) {
    return safeReturn;
  }

  if (safeReturn && isPathAllowedForRole(safeReturn, profileRole)) {
    return safeReturn;
  }

  return dashboardPathForRole(profileRole);
}

/** Login target when an unauthenticated user hits a protected route. */
export function getAuthLoginPathForRoute(pathname: string, returnPath: string): string {
  const safe = sanitizeReturnTo(returnPath) ?? sanitizeReturnTo(pathname);
  if (isAdminRoute(pathname)) {
    if (safe) {
      return `${ROUTES.adminLogin}?returnTo=${encodeURIComponent(safe)}`;
    }
    return ROUTES.adminLogin;
  }
  return ROUTES.login;
}

export function fluxHostForTests(): typeof FLUX_HOSTNAME {
  return FLUX_HOSTNAME;
}

export function linkhelpPublicOriginForTests(): typeof LINKHELP_PUBLIC_ORIGIN {
  return LINKHELP_PUBLIC_ORIGIN;
}
