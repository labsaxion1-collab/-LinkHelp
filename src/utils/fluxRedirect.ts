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

/** Admin FLUX login — only `/admin/*` paths (blocks open redirect). */
export function sanitizeAdminReturnTo(raw: string | null | undefined): string | null {
  const safe = sanitizeReturnTo(raw);
  if (!safe || !isAdminRoute(safe)) return null;
  return safe;
}

const FLUX_ADMIN_RETURN_TO_KEY = 'flux_admin_return_to';

export function persistAdminReturnTo(path: string | null): void {
  if (typeof window === 'undefined') return;
  const safe = sanitizeAdminReturnTo(path);
  if (safe) sessionStorage.setItem(FLUX_ADMIN_RETURN_TO_KEY, safe);
  else sessionStorage.removeItem(FLUX_ADMIN_RETURN_TO_KEY);
}

export function readPersistedAdminReturnTo(): string | null {
  if (typeof window === 'undefined') return null;
  return sanitizeAdminReturnTo(sessionStorage.getItem(FLUX_ADMIN_RETURN_TO_KEY));
}

export function clearPersistedAdminReturnTo(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(FLUX_ADMIN_RETURN_TO_KEY);
}

/**
 * Destination after FLUX admin login — never marketplace home or client/helper dashboards.
 */
export function getAdminPostLoginDestination(session: Session | null, returnTo?: string | null): string {
  if (!isFluxAdmin(session)) {
    return ROUTES.fluxAccessDenied;
  }
  const safe = sanitizeAdminReturnTo(returnTo);
  return safe ?? ROUTES.adminDashboard;
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

  if (adminUser) {
    return ROUTES.adminDashboard;
  }

  if (safeReturn && isPathAllowedForRole(safeReturn, profileRole)) {
    return safeReturn;
  }

  return dashboardPathForRole(profileRole);
}

/** Login target when an unauthenticated user hits a protected route. */
export function getAuthLoginPathForRoute(pathname: string, returnPath: string): string {
  const safeAdmin = sanitizeAdminReturnTo(returnPath) ?? sanitizeAdminReturnTo(pathname);
  if (isAdminRoute(pathname)) {
    if (safeAdmin) {
      return `${ROUTES.adminLogin}?returnTo=${encodeURIComponent(safeAdmin)}`;
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
