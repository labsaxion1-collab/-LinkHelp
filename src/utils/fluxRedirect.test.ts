import type { Session } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ROUTES } from '@/utils/constants';
import { FLUX_HOSTNAME, isAdminRoute, isFluxHost, isFluxHostAllowedPath } from '@/utils/fluxHost';
import {
  getAdminPostLoginDestination,
  getAuthLoginPathForRoute,
  getFluxHostAdminLoginPath,
  getPostLoginDestination,
  resolveAuthCallbackDestination,
  resolveAdminOAuthReturnTo,
  resolveFluxHostNavigation,
  sanitizeAdminReturnTo,
  sanitizeReturnTo,
  persistAdminReturnTo,
  markAdminOAuthFlow,
} from '@/utils/fluxRedirect';
import { getOAuthRedirectToUrl } from '@/utils/oauthRedirect';
import { FluxAdminSidebar } from '@/components/admin/FluxAdminSidebar';

function adminSession(): Session {
  return {
    user: { id: 'admin-1', app_metadata: { role: 'admin' } },
  } as Session;
}

function fluxAdminSession(): Session {
  return {
    user: { id: 'flux-1', app_metadata: { role: 'flux_admin' } },
  } as Session;
}

function clientSession(): Session {
  return {
    user: { id: 'client-1', app_metadata: { role: 'client' } },
  } as Session;
}

function helperSession(): Session {
  return {
    user: { id: 'helper-1', app_metadata: { role: 'client' }, user_metadata: { user_type: 'helper' } },
  } as Session;
}

describe('isFluxHost', () => {
  it('recognizes flux production hostname', () => {
    expect(isFluxHost(FLUX_HOSTNAME)).toBe(true);
    expect(isFluxHost('www.linkhelp.app')).toBe(false);
    expect(isFluxHost('linkhelp.app')).toBe(false);
    expect(isFluxHost('link-help-git-feature-backoffice-p0.vercel.app')).toBe(false);
  });
});

describe('isFluxHostAllowedPath', () => {
  it('allows admin, auth, and callback routes without FLUX entry redirect', () => {
    expect(isFluxHostAllowedPath('/admin/users')).toBe(true);
    expect(isFluxHostAllowedPath(ROUTES.adminLogin)).toBe(true);
    expect(isFluxHostAllowedPath(ROUTES.authCallback)).toBe(true);
    expect(isFluxHostAllowedPath(ROUTES.fluxAccessDenied)).toBe(true);
    expect(isFluxHostAllowedPath(ROUTES.home)).toBe(false);
  });
});

describe('getFluxHostAdminLoginPath', () => {
  it('defaults returnTo to admin dashboard', () => {
    expect(getFluxHostAdminLoginPath()).toBe(
      `${ROUTES.adminLogin}?returnTo=${encodeURIComponent(ROUTES.adminDashboard)}`,
    );
  });
});

describe('resolveFluxHostNavigation', () => {
  it('flux host / → admin login with returnTo when logged out', () => {
    expect(
      resolveFluxHostNavigation({
        pathname: ROUTES.home,
        authedAdmin: false,
        hasSession: false,
      }),
    ).toBe(`${ROUTES.adminLogin}?returnTo=${encodeURIComponent(ROUTES.adminDashboard)}`);
  });

  it('flux host / → admin dashboard when admin authenticated', () => {
    expect(
      resolveFluxHostNavigation({
        pathname: ROUTES.home,
        authedAdmin: true,
        hasSession: true,
      }),
    ).toBe(ROUTES.adminDashboard);
  });

  it('flux host /admin/users → no redirect (handled by AdminProtectedRoute)', () => {
    expect(
      resolveFluxHostNavigation({
        pathname: ROUTES.adminUsers,
        authedAdmin: false,
        hasSession: false,
      }),
    ).toBeNull();
  });

  it('flux host admin login → no redirect loop', () => {
    expect(
      resolveFluxHostNavigation({
        pathname: ROUTES.adminLogin,
        authedAdmin: false,
        hasSession: false,
      }),
    ).toBeNull();
  });

  it('flux host auth callback → no redirect before OAuth completes', () => {
    expect(
      resolveFluxHostNavigation({
        pathname: ROUTES.authCallback,
        authedAdmin: false,
        hasSession: false,
      }),
    ).toBeNull();
  });

  it('flux host flux-access-denied stays accessible', () => {
    expect(
      resolveFluxHostNavigation({
        pathname: ROUTES.fluxAccessDenied,
        authedAdmin: false,
        hasSession: true,
      }),
    ).toBeNull();
  });

  it('client session on flux host marketplace path → access denied', () => {
    expect(
      resolveFluxHostNavigation({
        pathname: ROUTES.home,
        authedAdmin: false,
        hasSession: true,
      }),
    ).toBe(ROUTES.fluxAccessDenied);
  });

  it('client session on flux host /client → access denied', () => {
    expect(
      resolveFluxHostNavigation({
        pathname: ROUTES.clientDashboard,
        authedAdmin: false,
        hasSession: true,
      }),
    ).toBe(ROUTES.fluxAccessDenied);
  });

  it('www host navigation helper is not used here — preview admin deep link unchanged', () => {
    expect(
      getPostLoginDestination({
        hostname: 'www.linkhelp.app',
        profileRole: 'client',
        session: clientSession(),
        returnTo: null,
      }),
    ).toBe(ROUTES.clientDashboard);
  });
});

describe('isAdminRoute', () => {
  it('matches admin paths', () => {
    expect(isAdminRoute('/admin/users')).toBe(true);
    expect(isAdminRoute('/client/dashboard')).toBe(false);
  });
});

describe('sanitizeReturnTo', () => {
  it('accepts internal paths', () => {
    expect(sanitizeReturnTo('/admin/users')).toBe('/admin/users');
    expect(sanitizeReturnTo('/admin/users?tab=1')).toBe('/admin/users?tab=1');
  });

  it('rejects external open redirects', () => {
    expect(sanitizeReturnTo('https://evil.com')).toBeNull();
    expect(sanitizeReturnTo('//evil.com/path')).toBeNull();
    expect(sanitizeReturnTo('javascript:alert(1)')).toBeNull();
  });
});

describe('sanitizeAdminReturnTo', () => {
  it('allows only admin paths', () => {
    expect(sanitizeAdminReturnTo('/admin/users')).toBe('/admin/users');
    expect(sanitizeAdminReturnTo('/client/dashboard')).toBeNull();
    expect(sanitizeAdminReturnTo('/')).toBeNull();
  });
});

describe('getAdminPostLoginDestination', () => {
  it('1 admin + returnTo=/admin/users → /admin/users', () => {
    expect(getAdminPostLoginDestination(adminSession(), '/admin/users')).toBe(ROUTES.adminUsers);
  });

  it('2 admin + returnTo=/admin/dashboard → /admin/dashboard', () => {
    expect(getAdminPostLoginDestination(fluxAdminSession(), '/admin/dashboard')).toBe(ROUTES.adminDashboard);
  });

  it('3 admin without returnTo → /admin/dashboard', () => {
    expect(getAdminPostLoginDestination(adminSession(), null)).toBe(ROUTES.adminDashboard);
  });

  it('4 client on FLUX login → access denied', () => {
    expect(getAdminPostLoginDestination(clientSession(), '/admin/users')).toBe(ROUTES.fluxAccessDenied);
  });

  it('5 helper on FLUX login → access denied', () => {
    expect(getAdminPostLoginDestination(helperSession(), '/admin/dashboard')).toBe(ROUTES.fluxAccessDenied);
  });

  it('6 external returnTo rejected → /admin/dashboard', () => {
    expect(getAdminPostLoginDestination(adminSession(), 'https://site-malicioso.com')).toBe(ROUTES.adminDashboard);
  });

  it('7 never returns marketplace home or client/helper dashboards', () => {
    const dest = getAdminPostLoginDestination(adminSession(), '/messages');
    expect(dest).toBe(ROUTES.adminDashboard);
    expect(dest).not.toBe(ROUTES.home);
    expect(dest).not.toBe(ROUTES.clientDashboard);
  });
});

describe('getPostLoginDestination', () => {
  it('flux host + admin → admin dashboard', () => {
    expect(
      getPostLoginDestination({
        hostname: FLUX_HOSTNAME,
        profileRole: 'client',
        session: adminSession(),
        returnTo: null,
      }),
    ).toBe(ROUTES.adminDashboard);
  });

  it('flux host + client profile → access denied', () => {
    expect(
      getPostLoginDestination({
        hostname: FLUX_HOSTNAME,
        profileRole: 'client',
        session: clientSession(),
        returnTo: null,
      }),
    ).toBe(ROUTES.fluxAccessDenied);
  });

  it('www host + client → client dashboard', () => {
    expect(
      getPostLoginDestination({
        hostname: 'www.linkhelp.app',
        profileRole: 'client',
        session: clientSession(),
        returnTo: null,
      }),
    ).toBe(ROUTES.clientDashboard);
  });

  it('www host + helper → helper dashboard', () => {
    expect(
      getPostLoginDestination({
        hostname: 'www.linkhelp.app',
        profileRole: 'helper',
        session: helperSession(),
        returnTo: null,
      }),
    ).toBe(ROUTES.helperDashboard);
  });

  it('preserves returnTo /admin/users for admin on preview host', () => {
    expect(
      getPostLoginDestination({
        hostname: 'link-help-git-feature-backoffice-p0.vercel.app',
        profileRole: 'client',
        session: adminSession(),
        returnTo: '/admin/users',
      }),
    ).toBe(ROUTES.adminUsers);
  });

  it('admin without returnTo on preview → admin dashboard', () => {
    expect(
      getPostLoginDestination({
        hostname: 'link-help-n5jyza9n7-labsaxion1-4960s-projects.vercel.app',
        profileRole: 'client',
        session: adminSession(),
        returnTo: null,
      }),
    ).toBe(ROUTES.adminDashboard);
  });

  it('preview host preserves relative admin return (not production origin)', () => {
    const dest = getPostLoginDestination({
      hostname: 'link-help-n5jyza9n7-labsaxion1-4960s-projects.vercel.app',
      profileRole: 'client',
      session: adminSession(),
      returnTo: '/admin/users',
    });
    expect(dest).toBe('/admin/users');
    expect(dest).not.toContain('www.linkhelp.app');
  });

  it('www host client with public path unchanged', () => {
    expect(
      getPostLoginDestination({
        hostname: 'www.linkhelp.app',
        profileRole: 'client',
        session: clientSession(),
        returnTo: '/messages',
      }),
    ).toBe('/messages');
  });
});

describe('getAuthLoginPathForRoute', () => {
  it('admin routes use admin login with returnTo query', () => {
    const path = getAuthLoginPathForRoute('/admin/users', '/admin/users');
    expect(path).toBe(`${ROUTES.adminLogin}?returnTo=${encodeURIComponent('/admin/users')}`);
  });

  it('rejects non-admin returnTo on admin login path', () => {
    const path = getAuthLoginPathForRoute('/admin/users', '/client/dashboard');
    expect(path).toBe(`${ROUTES.adminLogin}?returnTo=${encodeURIComponent('/admin/users')}`);
  });
});

describe('getOAuthRedirectToUrl', () => {
  it('OAuth admin callback uses preview origin and next=/admin/users', () => {
    const previous = global.window;
    Object.defineProperty(global, 'window', {
      value: {
        location: { origin: 'https://link-help-git-feature-backoffice-p0.vercel.app' },
      },
      configurable: true,
    });
    expect(getOAuthRedirectToUrl('/admin/users')).toBe(
      'https://link-help-git-feature-backoffice-p0.vercel.app/auth/callback?next=%2Fadmin%2Fusers',
    );
    Object.defineProperty(global, 'window', { value: previous, configurable: true });
  });

  it('OAuth callback never embeds production origin when window is preview', () => {
    const previous = global.window;
    Object.defineProperty(global, 'window', {
      value: {
        location: { origin: 'https://link-help-57ooop767-labsaxion1-4960s-projects.vercel.app' },
      },
      configurable: true,
    });
    const url = getOAuthRedirectToUrl('/admin/users');
    expect(url).toContain('link-help-57ooop767-labsaxion1-4960s-projects.vercel.app');
    expect(url).not.toContain('www.linkhelp.app');
    Object.defineProperty(global, 'window', { value: previous, configurable: true });
  });
});

describe('resolveAuthCallbackDestination', () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
      clear: () => storage.clear(),
      key: () => null,
      length: 0,
    });
    vi.stubGlobal('window', { sessionStorage: globalThis.sessionStorage });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('1 OAuth admin + next=/admin/users → /admin/users', () => {
    expect(
      resolveAuthCallbackDestination({
        session: adminSession(),
        nextFromUrl: '/admin/users',
        profileRole: 'client',
        hostname: 'link-help-preview.vercel.app',
      }),
    ).toBe(ROUTES.adminUsers);
  });

  it('2 OAuth admin + persisted returnTo when next missing → persisted admin route', () => {
    persistAdminReturnTo('/admin/users');
    markAdminOAuthFlow();
    expect(
      resolveAuthCallbackDestination({
        session: adminSession(),
        nextFromUrl: null,
        profileRole: 'client',
        hostname: 'link-help-preview.vercel.app',
      }),
    ).toBe(ROUTES.adminUsers);
    expect(resolveAdminOAuthReturnTo(null)).toBe('/admin/users');
  });

  it('3 admin next wins over client profile fallback', () => {
    expect(
      resolveAuthCallbackDestination({
        session: adminSession(),
        nextFromUrl: '/admin/users',
        profileRole: 'client',
        hostname: 'www.linkhelp.app',
      }),
    ).toBe(ROUTES.adminUsers);
  });

  it('4 admin without next → /admin/dashboard', () => {
    expect(
      resolveAuthCallbackDestination({
        session: adminSession(),
        nextFromUrl: null,
        profileRole: 'client',
        hostname: 'link-help-preview.vercel.app',
      }),
    ).toBe(ROUTES.adminDashboard);
  });

  it('5 Google user without app_metadata admin → flux-access-denied on admin OAuth flow', () => {
    markAdminOAuthFlow();
    expect(
      resolveAuthCallbackDestination({
        session: clientSession(),
        nextFromUrl: '/admin/users',
        profileRole: 'client',
        hostname: 'link-help-preview.vercel.app',
      }),
    ).toBe(ROUTES.fluxAccessDenied);
  });

  it('6 callback never returns client dashboard when admin next present', () => {
    const dest = resolveAuthCallbackDestination({
      session: adminSession(),
      nextFromUrl: '/admin/users',
      profileRole: 'client',
      hostname: 'link-help-preview.vercel.app',
    });
    expect(dest).not.toBe(ROUTES.clientDashboard);
    expect(dest).not.toBe(ROUTES.helperDashboard);
    expect(dest).not.toBe(ROUTES.home);
  });

  it('7 normal LinkHelp OAuth without admin flow → client dashboard', () => {
    expect(
      resolveAuthCallbackDestination({
        session: clientSession(),
        nextFromUrl: null,
        profileRole: 'client',
        hostname: 'www.linkhelp.app',
      }),
    ).toBe(ROUTES.clientDashboard);
  });

  it('8 email admin path still covered by getAdminPostLoginDestination', () => {
    expect(getAdminPostLoginDestination(adminSession(), '/admin/users')).toBe(ROUTES.adminUsers);
  });
});

describe('FluxAdminSidebar routes', () => {
  it('backoffice sidebar still references admin routes', () => {
    expect(ROUTES.adminUsers).toBe('/admin/users');
    expect(ROUTES.adminDashboard).toBe('/admin/dashboard');
    expect(ROUTES.adminAdministrators).toBe('/admin/administrators');
    expect(FluxAdminSidebar).toBeDefined();
  });
});
