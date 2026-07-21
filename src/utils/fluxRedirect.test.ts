import type { Session } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { ROUTES } from '@/utils/constants';
import { FLUX_HOSTNAME, isAdminRoute, isFluxHost } from '@/utils/fluxHost';
import {
  getAuthLoginPathForRoute,
  getPostLoginDestination,
  sanitizeReturnTo,
} from '@/utils/fluxRedirect';
import { getOAuthRedirectToUrl } from '@/utils/oauthRedirect';
import { FluxAdminSidebar } from '@/components/admin/FluxAdminSidebar';

function adminSession(): Session {
  return {
    user: { id: 'admin-1', app_metadata: { role: 'admin' } },
  } as Session;
}

function clientSession(): Session {
  return {
    user: { id: 'client-1', app_metadata: { role: 'client' } },
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

describe('getPostLoginDestination', () => {
  it('1 flux host + admin → admin dashboard', () => {
    expect(
      getPostLoginDestination({
        hostname: FLUX_HOSTNAME,
        profileRole: 'client',
        session: adminSession(),
        returnTo: null,
      }),
    ).toBe(ROUTES.adminDashboard);
  });

  it('2 flux host + client profile → access denied', () => {
    expect(
      getPostLoginDestination({
        hostname: FLUX_HOSTNAME,
        profileRole: 'client',
        session: clientSession(),
        returnTo: null,
      }),
    ).toBe(ROUTES.fluxAccessDenied);
  });

  it('3 flux host + helper session metadata → access denied', () => {
    expect(
      getPostLoginDestination({
        hostname: FLUX_HOSTNAME,
        profileRole: 'helper',
        session: clientSession(),
        returnTo: null,
      }),
    ).toBe(ROUTES.fluxAccessDenied);
  });

  it('4 flux host without session → admin login path via guard (destination denied when no admin)', () => {
    expect(
      getPostLoginDestination({
        hostname: FLUX_HOSTNAME,
        profileRole: 'client',
        session: null,
        returnTo: null,
      }),
    ).toBe(ROUTES.fluxAccessDenied);
  });

  it('5 www host + client → client dashboard', () => {
    expect(
      getPostLoginDestination({
        hostname: 'www.linkhelp.app',
        profileRole: 'client',
        session: clientSession(),
        returnTo: null,
      }),
    ).toBe(ROUTES.clientDashboard);
  });

  it('6 www host + helper → helper dashboard', () => {
    expect(
      getPostLoginDestination({
        hostname: 'www.linkhelp.app',
        profileRole: 'helper',
        session: clientSession(),
        returnTo: null,
      }),
    ).toBe(ROUTES.helperDashboard);
  });

  it('7 preserves returnTo /admin/users for admin on preview host', () => {
    expect(
      getPostLoginDestination({
        hostname: 'link-help-git-feature-backoffice-p0.vercel.app',
        profileRole: 'client',
        session: adminSession(),
        returnTo: '/admin/users',
      }),
    ).toBe(ROUTES.adminUsers);
  });

  it('8 rejects external returnTo', () => {
    expect(
      getPostLoginDestination({
        hostname: 'www.linkhelp.app',
        profileRole: 'client',
        session: clientSession(),
        returnTo: 'https://evil.com',
      }),
    ).toBe(ROUTES.clientDashboard);
  });

  it('9 preview host preserves relative admin return (not production origin)', () => {
    const dest = getPostLoginDestination({
      hostname: 'link-help-n5jyza9n7-labsaxion1-4960s-projects.vercel.app',
      profileRole: 'client',
      session: adminSession(),
      returnTo: '/admin/users',
    });
    expect(dest).toBe('/admin/users');
    expect(dest).not.toContain('www.linkhelp.app');
  });

  it('11 www host client with public path unchanged', () => {
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
});

describe('getOAuthRedirectToUrl', () => {
  it('10 OAuth callback preserves current origin in browser', () => {
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
  it('12 backoffice sidebar still references admin routes', () => {
    expect(ROUTES.adminUsers).toBe('/admin/users');
    expect(ROUTES.adminDashboard).toBe('/admin/dashboard');
    expect(FluxAdminSidebar).toBeDefined();
  });
});
