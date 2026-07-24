import { describe, expect, it, vi } from 'vitest';
import { ROUTES } from '@/utils/constants';
import {
  APP_HOSTNAME,
  APP_ORIGIN,
  FLUX_HOSTNAME,
  FLUX_ORIGIN,
  PUBLIC_ORIGIN,
  WWW_HOSTNAME,
  isAppHost,
  isFluxHost,
  isLocalHost,
  isPreviewHost,
  isWwwHost,
  resolveHostProfileFromHostname,
  shouldRegisterServiceWorker,
} from '@/utils/linkhelpHosts';
import {
  buildExternalOriginUrl,
  isInstitutionalPath,
  resolveCatchAllInAppTarget,
  resolveExternalHostRedirect,
} from '@/utils/hostRouting';
import { getOAuthRedirectToUrl } from '@/utils/oauthRedirect';
import { isAllowedCheckoutOrigin, resolveCheckoutSiteUrl } from '../../api/stripe/siteUrl';

describe('resolveHostProfileFromHostname (production)', () => {
  it('maps production hostnames', () => {
    expect(resolveHostProfileFromHostname(WWW_HOSTNAME, { production: true })).toBe('www');
    expect(resolveHostProfileFromHostname(APP_HOSTNAME, { production: true })).toBe('app');
    expect(resolveHostProfileFromHostname(FLUX_HOSTNAME, { production: true })).toBe('flux');
    expect(resolveHostProfileFromHostname('link-help.vercel.app', { production: true })).toBe('combined');
    expect(resolveHostProfileFromHostname('linkhelp.app', { production: true })).toBe('combined');
  });

  it('production ignores simulated profile on real hostnames; preview may simulate', () => {
    expect(
      resolveHostProfileFromHostname('localhost', {
        production: true,
        simulatedProfile: 'app',
      }),
    ).toBe('combined');
    expect(
      resolveHostProfileFromHostname(APP_HOSTNAME, {
        production: true,
        simulatedProfile: 'www',
      }),
    ).toBe('app');
    expect(
      resolveHostProfileFromHostname('link-help-git-x.vercel.app', {
        production: true,
        simulatedProfile: 'app',
      }),
    ).toBe('app');
  });
});

describe('resolveHostProfileFromHostname (dev/preview)', () => {
  it('simulates www/app/flux on localhost', () => {
    expect(
      resolveHostProfileFromHostname('localhost', { production: false, simulatedProfile: 'app' }),
    ).toBe('app');
    expect(
      resolveHostProfileFromHostname('localhost', { production: false, simulatedProfile: 'www' }),
    ).toBe('www');
    expect(
      resolveHostProfileFromHostname('localhost', { production: false, simulatedProfile: 'flux' }),
    ).toBe('flux');
  });

  it('preview without simulation stays combined', () => {
    expect(
      resolveHostProfileFromHostname('link-help-git-x.vercel.app', { production: false }),
    ).toBe('combined');
  });
});

describe('isPreviewHost / isLocalHost', () => {
  it('detects preview and local hosts', () => {
    expect(isPreviewHost('link-help.vercel.app')).toBe(true);
    expect(isPreviewHost('www.linkhelp.app')).toBe(false);
    expect(isLocalHost('localhost')).toBe(true);
    expect(isLocalHost('127.0.0.1')).toBe(true);
  });
});

describe('explicit hostname helpers', () => {
  it('isFluxHost with explicit hostname is literal only', () => {
    expect(isFluxHost(FLUX_HOSTNAME)).toBe(true);
    expect(isFluxHost('www.linkhelp.app')).toBe(false);
  });

  it('isWwwHost / isAppHost with explicit hostname', () => {
    expect(isWwwHost(WWW_HOSTNAME)).toBe(true);
    expect(isAppHost(APP_HOSTNAME)).toBe(true);
    expect(isAppHost(WWW_HOSTNAME)).toBe(false);
  });
});

describe('institutional paths and www redirects', () => {
  it('www + / → no external redirect', () => {
    expect(isInstitutionalPath('/')).toBe(true);
    expect(isInstitutionalPath(ROUTES.howItWorks)).toBe(true);
    expect(isInstitutionalPath(ROUTES.contact)).toBe(true);
    expect(resolveExternalHostRedirect('www', { pathname: ROUTES.home })).toBeNull();
  });

  it('www + /auth/login → app with query preserved', () => {
    const url = resolveExternalHostRedirect('www', {
      pathname: ROUTES.login,
      search: '?returnTo=%2Fclient',
      hash: '#x',
    });
    expect(url).toBe(`${APP_ORIGIN}${ROUTES.login}?returnTo=%2Fclient#x`);
  });

  it('www + /client/dashboard → app', () => {
    expect(resolveExternalHostRedirect('www', { pathname: ROUTES.clientDashboard })).toBe(
      `${APP_ORIGIN}${ROUTES.clientDashboard}`,
    );
  });
});

describe('app host redirects', () => {
  it('app + /como-funciona → www', () => {
    expect(resolveExternalHostRedirect('app', { pathname: ROUTES.howItWorks })).toBe(
      `${PUBLIC_ORIGIN}${ROUTES.howItWorks}`,
    );
  });

  it('app + /admin/users → flux with query', () => {
    expect(
      resolveExternalHostRedirect('app', {
        pathname: ROUTES.adminUsers,
        search: '?tab=1',
      }),
    ).toBe(`${FLUX_ORIGIN}${ROUTES.adminUsers}?tab=1`);
  });

  it('app + /auth/login stays in-app', () => {
    expect(resolveExternalHostRedirect('app', { pathname: ROUTES.login })).toBeNull();
  });

  it('catch-all targets', () => {
    expect(resolveCatchAllInAppTarget('www')).toBe(ROUTES.home);
    expect(resolveCatchAllInAppTarget('app')).toBe(ROUTES.login);
    expect(resolveCatchAllInAppTarget('combined')).toBe(ROUTES.home);
  });
});

describe('buildExternalOriginUrl', () => {
  it('preserves pathname search hash without loops', () => {
    const one = buildExternalOriginUrl(APP_ORIGIN, '/messages', '?c=1', '#h');
    const two = buildExternalOriginUrl(APP_ORIGIN, '/messages', '?c=1', '#h');
    expect(one).toBe(two);
    expect(one).toBe('https://app.linkhelp.app/messages?c=1#h');
  });
});

describe('OAuth redirect origin', () => {
  it('uses window.origin in browser (app host)', () => {
    vi.stubGlobal('window', {
      location: { origin: APP_ORIGIN },
    });
    expect(getOAuthRedirectToUrl()).toBe(`${APP_ORIGIN}${ROUTES.authCallback}`);
    vi.unstubAllGlobals();
  });
});

describe('Stripe checkout origin allowlist', () => {
  it('accepts app.linkhelp.app', () => {
    expect(isAllowedCheckoutOrigin(APP_ORIGIN)).toBe(true);
    expect(resolveCheckoutSiteUrl(APP_ORIGIN)).toBe(APP_ORIGIN);
  });

  it('rejects unknown origins', () => {
    expect(isAllowedCheckoutOrigin('https://evil.example')).toBe(false);
  });
});

describe('shouldRegisterServiceWorker', () => {
  it('is false on www hostname', () => {
    vi.stubGlobal('window', { location: { hostname: WWW_HOSTNAME } });
    expect(shouldRegisterServiceWorker()).toBe(false);
    vi.unstubAllGlobals();
  });

  it('is true on app hostname', () => {
    vi.stubGlobal('window', { location: { hostname: APP_HOSTNAME } });
    expect(shouldRegisterServiceWorker()).toBe(true);
    vi.unstubAllGlobals();
  });

  it('is false on flux hostname', () => {
    vi.stubGlobal('window', { location: { hostname: FLUX_HOSTNAME } });
    expect(shouldRegisterServiceWorker()).toBe(false);
    vi.unstubAllGlobals();
  });
});
