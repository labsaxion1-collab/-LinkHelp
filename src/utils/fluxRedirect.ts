import type { Session } from '@supabase/supabase-js';
import { isFluxAdmin } from '@/utils/adminAccess';
import { ROUTES } from '@/utils/constants';
import {
  FLUX_HOSTNAME,
  isAdminRoute,
  isFluxHost,
  isFluxHostAllowedPath,
  isFluxHostMarketplaceEntry,
  LINKHELP_PUBLIC_ORIGIN,
} from '@/utils/fluxHost';
import { isAppShellPath } from '@/utils/navigation';
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
const FLUX_ADMIN_OAUTH_PENDING_KEY = 'flux_admin_oauth_pending';

/** Set before admin Google OAuth so callback can recover returnTo if Supabase drops `next`. */
export function markAdminOAuthFlow(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(FLUX_ADMIN_OAUTH_PENDING_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function isAdminOAuthFlowPending(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(FLUX_ADMIN_OAUTH_PENDING_KEY) === '1';
  } catch {
    return false;
  }
}

export function clearAdminOAuthFlow(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(FLUX_ADMIN_OAUTH_PENDING_KEY);
  } catch {
    /* ignore */
  }
}

export function persistAdminReturnTo(path: string | null): void {
  if (typeof window === 'undefined') return;
  const safe = sanitizeAdminReturnTo(path);
  try {
    if (safe) window.sessionStorage.setItem(FLUX_ADMIN_RETURN_TO_KEY, safe);
    else window.sessionStorage.removeItem(FLUX_ADMIN_RETURN_TO_KEY);
  } catch {
    /* private mode / blocked storage */
  }
}

export function readPersistedAdminReturnTo(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sanitizeAdminReturnTo(window.sessionStorage.getItem(FLUX_ADMIN_RETURN_TO_KEY));
  } catch {
    return null;
  }
}

export function clearPersistedAdminReturnTo(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(FLUX_ADMIN_RETURN_TO_KEY);
  } catch {
    /* ignore */
  }
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

/** URL `next` wins; otherwise admin login returnTo from sessionStorage (OAuth). */
export function resolveAdminOAuthReturnTo(nextFromUrl: string | null | undefined): string | null {
  const fromUrl = sanitizeAdminReturnTo(nextFromUrl);
  if (fromUrl) return fromUrl;
  return readPersistedAdminReturnTo();
}

export type AuthCallbackDestinationInput = {
  session: Session | null;
  nextFromUrl: string | null;
  profileRole: ProfileRole;
  hostname?: string;
};

/**
 * OAuth callback routing — admin FLUX flow when `next` is admin, returnTo persisted, or admin OAuth flag.
 */
export function resolveAuthCallbackDestination(input: AuthCallbackDestinationInput): string {
  const { session, nextFromUrl, profileRole, hostname } = input;
  const adminReturn = resolveAdminOAuthReturnTo(nextFromUrl);
  const adminOAuthFlow = Boolean(adminReturn) || isAdminOAuthFlowPending();

  if (adminOAuthFlow) {
    return getAdminPostLoginDestination(session, adminReturn);
  }

  return getPostLoginDestination({
    hostname,
    profileRole,
    session,
    returnTo: sanitizeReturnTo(nextFromUrl),
  });
}

export function clearAdminOAuthState(): void {
  clearPersistedAdminReturnTo();
  clearAdminOAuthFlow();
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

/** Admin login on flux.linkhelp.app with safe default returnTo. */
export function getFluxHostAdminLoginPath(returnTo: string = ROUTES.adminDashboard): string {
  const safe = sanitizeAdminReturnTo(returnTo) ?? ROUTES.adminDashboard;
  return `${ROUTES.adminLogin}?returnTo=${encodeURIComponent(safe)}`;
}

export type FluxHostNavigationInput = {
  pathname: string;
  authedAdmin: boolean;
  hasSession: boolean;
};

/**
 * FLUX host redirect target, or null when the current path should render normally.
 * Uses relative in-app paths only (React Router Navigate).
 */
export function resolveFluxHostNavigation(input: FluxHostNavigationInput): string | null {
  const { pathname, authedAdmin, hasSession } = input;

  if (isFluxHostAllowedPath(pathname)) {
    return null;
  }

  if (isFluxHostMarketplaceEntry(pathname)) {
    if (authedAdmin) return ROUTES.adminDashboard;
    if (hasSession) return ROUTES.fluxAccessDenied;
    return getFluxHostAdminLoginPath(ROUTES.adminDashboard);
  }

  if (isAppShellPath(pathname) || pathname === ROUTES.dashboard) {
    if (hasSession && !authedAdmin) return ROUTES.fluxAccessDenied;
    if (!hasSession) return getFluxHostAdminLoginPath(ROUTES.adminDashboard);
    if (authedAdmin) return ROUTES.adminDashboard;
  }

  if (authedAdmin) return ROUTES.adminDashboard;
  if (hasSession) return ROUTES.fluxAccessDenied;
  return getFluxHostAdminLoginPath(ROUTES.adminDashboard);
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
