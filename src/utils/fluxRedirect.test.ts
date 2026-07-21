import type { Session } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { ROUTES } from '@/utils/constants';
import { FLUX_HOSTNAME, isAdminRoute, isFluxHost } from '@/utils/fluxHost';
import {
  getAdminPostLoginDestination,
  getAuthLoginPathForRoute,
  getPostLoginDestination,
  sanitizeAdminReturnTo,
  sanitizeReturnTo,
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
    expect(isFluxHost('link-help-git-feature-backoffice-p0.vercel.app')).toBe(false);
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
  it('OAuth callback preserves current origin in browser', () => {
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
});

describe('FluxAdminSidebar routes', () => {
  it('backoffice sidebar still references admin routes', () => {
    expect(ROUTES.adminUsers).toBe('/admin/users');
    expect(ROUTES.adminDashboard).toBe('/admin/dashboard');
    expect(FluxAdminSidebar).toBeDefined();
  });
});
