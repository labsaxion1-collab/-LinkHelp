import { describe, expect, it, vi } from 'vitest';
import { ROUTES } from '@/utils/constants';
import { APP_ORIGIN, WWW_HOSTNAME, resolveHostProfileFromHostname } from '@/utils/linkhelpHosts';
import {
  APP_MARKETING_URLS,
  buildAppAbsoluteUrl,
  hrefForMarketplaceRoute,
} from '@/utils/marketingNav';

describe('marketingNav', () => {
  it('APP_MARKETING_URLS point to app origin', () => {
    expect(APP_MARKETING_URLS.open).toBe(`${APP_ORIGIN}/`);
    expect(APP_MARKETING_URLS.login).toBe(`${APP_ORIGIN}${ROUTES.login}`);
    expect(APP_MARKETING_URLS.registerClient).toBe(`${APP_ORIGIN}${ROUTES.signup}?role=client`);
    expect(APP_MARKETING_URLS.registerHelper).toBe(`${APP_ORIGIN}${ROUTES.signup}?role=helper`);
  });

  it('hrefForMarketplaceRoute uses app origin on www profile', () => {
    vi.stubGlobal('window', { location: { hostname: WWW_HOSTNAME } });
    expect(resolveHostProfileFromHostname(WWW_HOSTNAME, { production: true })).toBe('www');
    expect(hrefForMarketplaceRoute(ROUTES.login)).toBe(buildAppAbsoluteUrl(ROUTES.login));
    vi.unstubAllGlobals();
  });

  it('hrefForMarketplaceRoute keeps in-app path on combined profile', () => {
    vi.stubGlobal('window', { location: { hostname: 'localhost' } });
    expect(hrefForMarketplaceRoute(ROUTES.login)).toBe(ROUTES.login);
    vi.unstubAllGlobals();
  });
});
