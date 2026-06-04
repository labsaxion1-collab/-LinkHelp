import { LINKHELP_AUTH_STORAGE_KEY } from '@/lib/supabase';
import { authFlowLog } from '@/lib/authDebug';
import { ROUTES } from '@/utils/constants';

export const OAUTH_CALLBACK_ACTIVE_KEY = 'linkhelp_oauth_callback_active';
export const OAUTH_REDIRECT_PENDING_KEY = 'linkhelp_oauth_redirect_pending';

export function markOAuthCallbackActive(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(OAUTH_CALLBACK_ACTIVE_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function clearOAuthCallbackActive(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(OAUTH_CALLBACK_ACTIVE_KEY);
  } catch {
    /* ignore */
  }
}

export function isOAuthCallbackActive(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(OAUTH_CALLBACK_ACTIVE_KEY) === '1';
  } catch {
    return false;
  }
}

export function markOAuthRedirectPending(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(OAUTH_REDIRECT_PENDING_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function clearOAuthRedirectPending(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(OAUTH_REDIRECT_PENDING_KEY);
  } catch {
    /* ignore */
  }
}

export function isOAuthRedirectPending(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(OAUTH_REDIRECT_PENDING_KEY) === '1';
  } catch {
    return false;
  }
}

/** Leave the SPA for the OAuth provider — avoids React Router / PWA races after async signInWithOAuth. */
export function navigateToOAuthProvider(url: string): void {
  if (typeof window === 'undefined') return;

  markOAuthRedirectPending();
  markOAuthCallbackActive();

  let host = url;
  try {
    host = new URL(url).host;
  } catch {
    /* keep raw */
  }
  authFlowLog('oauth:navigate', { urlHost: host });

  // Hard navigation — do not use React Router here.
  window.location.replace(url);

  // After an async gap some browsers ignore replace; anchor click preserves user activation better.
  window.setTimeout(() => {
    if (!isOAuthRedirectPending()) return;
    try {
      const link = document.createElement('a');
      link.href = url;
      link.rel = 'noopener noreferrer';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      /* ignore */
    }
  }, 0);

  window.setTimeout(() => {
    if (!isOAuthRedirectPending()) return;
    window.location.href = url;
  }, 300);
}

export function isAuthCallbackPath(pathname?: string): boolean {
  const path =
    pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '');
  return path === ROUTES.authCallback || path.startsWith(`${ROUTES.authCallback}?`);
}

/** Login/register/reset — do not run refreshSession here (avoids GoTrue lock contention with OAuth). */
export function isPublicAuthPath(pathname?: string): boolean {
  const path =
    pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '');
  return (
    path === ROUTES.login ||
    path === ROUTES.signup ||
    path === ROUTES.authCallback ||
    path.startsWith(`${ROUTES.authCallback}?`) ||
    path === ROUTES.resetPassword ||
    path.startsWith(`${ROUTES.resetPassword}?`)
  );
}

export function clearLinkHelpAuthStorage(): void {
  if (typeof window === 'undefined') return;
  for (const k of Object.keys(localStorage)) {
    if (
      k === LINKHELP_AUTH_STORAGE_KEY ||
      k.startsWith(`${LINKHELP_AUTH_STORAGE_KEY}-`) ||
      (k.startsWith('sb-') && k.includes('-auth-token'))
    ) {
      try {
        localStorage.removeItem(k);
      } catch {
        /* ignore */
      }
    }
  }
}

export function readStoredRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LINKHELP_AUTH_STORAGE_KEY);
    if (!raw || raw === 'null') return null;
    const parsed = JSON.parse(raw) as { refresh_token?: unknown };
    const token = parsed?.refresh_token;
    return typeof token === 'string' && token.length > 0 ? token : null;
  } catch {
    return null;
  }
}

export function hasCorruptAuthStorage(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(LINKHELP_AUTH_STORAGE_KEY);
    if (!raw || raw === 'null') return false;
    JSON.parse(raw);
    return false;
  } catch {
    return true;
  }
}
