import { describe, expect, it, vi } from 'vitest';
import { ROUTES } from '@/utils/constants';
import { resolveExternalHostRedirect } from '@/utils/hostRouting';
import {
  APP_HOSTNAME,
  APP_ORIGIN,
  APEX_HOSTNAME,
  FLUX_HOSTNAME,
  WWW_HOSTNAME,
  shouldRegisterServiceWorker,
  shouldShowPwaInstallPrompt,
} from '@/utils/linkhelpHosts';
import { shouldShowLegacyPwaMigration } from '@/utils/legacyPwaMigration';
import {
  APP_MARKETING_URLS,
  hrefForMarketplaceRoute,
  isWwwInstitutionalSurface,
} from '@/utils/marketingNav';
import { isPwaStandalone } from '@/utils/pwaRuntime';

describe('www institutional surface', () => {
  it('www browser normal → institutional landing routes (no external redirect on /)', () => {
    vi.stubGlobal('window', { location: { hostname: WWW_HOSTNAME } });
    expect(isWwwInstitutionalSurface(ROUTES.home)).toBe(true);
    expect(resolveExternalHostRedirect('www', { pathname: ROUTES.home })).toBeNull();
    vi.unstubAllGlobals();
  });

  it('www header open app URL', () => {
    expect(APP_MARKETING_URLS.open).toBe(`${APP_ORIGIN}/`);
  });

  it('www Entrar → app auth/login', () => {
    expect(APP_MARKETING_URLS.login).toBe(`${APP_ORIGIN}${ROUTES.login}`);
    vi.stubGlobal('window', { location: { hostname: WWW_HOSTNAME } });
    expect(hrefForMarketplaceRoute(ROUTES.login)).toBe(APP_MARKETING_URLS.login);
    vi.unstubAllGlobals();
  });

  it('www Criar conta cliente → register?role=client', () => {
    expect(APP_MARKETING_URLS.registerClient).toBe(`${APP_ORIGIN}${ROUTES.signup}?role=client`);
  });

  it('www Criar conta helper → register?role=helper', () => {
    expect(APP_MARKETING_URLS.registerHelper).toBe(`${APP_ORIGIN}${ROUTES.signup}?role=helper`);
  });

  it('Instalar LinkHelp → app origin', () => {
    expect(APP_MARKETING_URLS.install).toBe(APP_MARKETING_URLS.open);
  });
});

describe('legacy PWA migration detection', () => {
  it('app browser normal → no migration', () => {
    expect(
      shouldShowLegacyPwaMigration({ hostname: APP_HOSTNAME, standalone: false }),
    ).toBe(false);
  });

  it('app standalone → no migration', () => {
    expect(
      shouldShowLegacyPwaMigration({ hostname: APP_HOSTNAME, standalone: true }),
    ).toBe(false);
  });

  it('www standalone → migration', () => {
    expect(
      shouldShowLegacyPwaMigration({ hostname: WWW_HOSTNAME, standalone: true }),
    ).toBe(true);
  });

  it('linkhelp.app standalone → migration', () => {
    expect(
      shouldShowLegacyPwaMigration({ hostname: APEX_HOSTNAME, standalone: true }),
    ).toBe(true);
  });

  it('flux standalone → no migration', () => {
    expect(
      shouldShowLegacyPwaMigration({ hostname: FLUX_HOSTNAME, standalone: true }),
    ).toBe(false);
  });
});

describe('PWA install prompt host gating', () => {
  it('CTA de instalação só no app (SW + prompt)', () => {
    vi.stubGlobal('window', { location: { hostname: WWW_HOSTNAME } });
    expect(shouldShowPwaInstallPrompt()).toBe(false);
    expect(shouldRegisterServiceWorker()).toBe(false);
    vi.unstubAllGlobals();

    vi.stubGlobal('window', { location: { hostname: APP_HOSTNAME } });
    expect(shouldShowPwaInstallPrompt()).toBe(true);
    vi.unstubAllGlobals();

    vi.stubGlobal('window', { location: { hostname: FLUX_HOSTNAME } });
    expect(shouldShowPwaInstallPrompt()).toBe(false);
    vi.unstubAllGlobals();
  });

  it('standalone no app → isPwaStandalone true (install CTA hidden at runtime)', () => {
    const win = {
      matchMedia: (q: string) => ({ matches: q.includes('standalone') }),
      navigator: { standalone: false },
    };
    expect(isPwaStandalone(win)).toBe(true);
  });
});

describe('redirect loops www ↔ app', () => {
  it('www institutional path stays on www', () => {
    expect(resolveExternalHostRedirect('www', { pathname: ROUTES.howItWorks })).toBeNull();
  });

  it('www marketplace path goes to app once', () => {
    const url = resolveExternalHostRedirect('www', {
      pathname: ROUTES.clientDashboard,
      search: '?x=1',
      hash: '#h',
    });
    expect(url).toBe(`${APP_ORIGIN}${ROUTES.clientDashboard}?x=1#h`);
    expect(resolveExternalHostRedirect('app', { pathname: ROUTES.clientDashboard })).toBeNull();
  });

  it('app institutional → www once', () => {
    const url = resolveExternalHostRedirect('app', { pathname: ROUTES.howItWorks });
    expect(url).toBe(`https://www.linkhelp.app${ROUTES.howItWorks}`);
  });
});
