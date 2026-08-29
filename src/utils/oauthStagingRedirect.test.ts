/**
 * OAuth redirectTo must preserve staging / app hosts (never bounce to Landing apex).
 */
import { describe, expect, it, vi } from 'vitest';
import { ROUTES } from '@/utils/constants';
import {
  APP_HOSTNAME,
  APP_ORIGIN,
  APEX_HOSTNAME,
  FLUX_ORIGIN,
  STAGING_TEST_HOSTNAME,
  STAGING_TEST_ORIGIN,
  WWW_HOSTNAME,
  resolveHostProfileFromHostname,
} from '@/utils/linkhelpHosts';
import {
  getEmailAuthRedirectToUrl,
  getOAuthRedirectToUrl,
  resolveOAuthReturnOrigin,
} from '@/utils/oauthRedirect';
import { resolveAuthCallbackDestination } from '@/utils/fluxRedirect';
import type { Session } from '@supabase/supabase-js';

function stubOrigin(origin: string) {
  vi.stubGlobal('window', { location: { origin, hostname: new URL(origin).hostname } });
}

describe('resolveOAuthReturnOrigin / getOAuthRedirectToUrl', () => {
  it('1. OAuth from teste.linkhelp.app redirects to teste callback', () => {
    stubOrigin(STAGING_TEST_ORIGIN);
    expect(resolveOAuthReturnOrigin(STAGING_TEST_ORIGIN)).toBe(STAGING_TEST_ORIGIN);
    expect(getOAuthRedirectToUrl()).toBe(`${STAGING_TEST_ORIGIN}${ROUTES.authCallback}`);
    vi.unstubAllGlobals();
  });

  it('2. OAuth from app.linkhelp.app redirects to app callback', () => {
    stubOrigin(APP_ORIGIN);
    expect(resolveOAuthReturnOrigin(APP_ORIGIN)).toBe(APP_ORIGIN);
    expect(getOAuthRedirectToUrl()).toBe(`${APP_ORIGIN}${ROUTES.authCallback}`);
    vi.unstubAllGlobals();
  });

  it('3. staging never returns www or apex as OAuth origin', () => {
    stubOrigin(STAGING_TEST_ORIGIN);
    const url = getOAuthRedirectToUrl();
    expect(url).toContain(STAGING_TEST_HOSTNAME);
    expect(url).not.toContain(`https://${WWW_HOSTNAME}`);
    expect(url).not.toContain(`https://${APEX_HOSTNAME}`);
    expect(url).not.toBe(`${APP_ORIGIN}${ROUTES.authCallback}`);
    vi.unstubAllGlobals();
  });

  it('4b. email confirm redirect from teste uses teste callback (not localhost)', () => {
    stubOrigin(STAGING_TEST_ORIGIN);
    const url = getEmailAuthRedirectToUrl();
    expect(url).toBe(`${STAGING_TEST_ORIGIN}${ROUTES.authCallback}`);
    expect(url).not.toContain('localhost');
    expect(url).not.toContain(':3000');
    vi.unstubAllGlobals();
  });

  it('4. arbitrary host is not accepted as OAuth return', () => {
    expect(resolveOAuthReturnOrigin('https://evil.example')).toBe(APP_ORIGIN);
    expect(resolveOAuthReturnOrigin('https://phish-linkhelp.app')).toBe(APP_ORIGIN);
    expect(resolveOAuthReturnOrigin(`https://${WWW_HOSTNAME}`)).toBe(APP_ORIGIN);
    expect(resolveOAuthReturnOrigin(`https://${APEX_HOSTNAME}`)).toBe(APP_ORIGIN);
  });

  it('5–6. callback destination on staging host is role dashboard (relative)', () => {
    const clientSession = {
      user: { id: 'c1', app_metadata: { role: 'client' } },
    } as Session;
    const helperSession = {
      user: { id: 'h1', app_metadata: { role: 'client' }, user_metadata: { user_type: 'helper' } },
    } as Session;

    expect(
      resolveAuthCallbackDestination({
        session: clientSession,
        nextFromUrl: null,
        profileRole: 'client',
        hostname: STAGING_TEST_HOSTNAME,
      }),
    ).toBe(ROUTES.clientDashboard);

    expect(
      resolveAuthCallbackDestination({
        session: helperSession,
        nextFromUrl: null,
        profileRole: 'helper',
        hostname: STAGING_TEST_HOSTNAME,
      }),
    ).toBe(ROUTES.helperDashboard);
  });

  it('7. production app host classification and OAuth origin remain app.linkhelp.app', () => {
    expect(resolveHostProfileFromHostname(APP_HOSTNAME, { production: true })).toBe('app');
    expect(resolveOAuthReturnOrigin(APP_ORIGIN)).toBe(APP_ORIGIN);
  });

  it('8. Landing hosts stay www/combined (not OAuth return origins)', () => {
    expect(resolveHostProfileFromHostname(WWW_HOSTNAME, { production: true })).toBe('www');
    expect(resolveHostProfileFromHostname(APEX_HOSTNAME, { production: true })).toBe('combined');
    expect(resolveOAuthReturnOrigin(`https://${WWW_HOSTNAME}`)).toBe(APP_ORIGIN);
  });

  it('9. Preview / localhost / flux remain allowlisted; PWA staging constant intact', async () => {
    expect(resolveOAuthReturnOrigin('http://localhost:3000')).toBe('http://localhost:3000');
    expect(resolveOAuthReturnOrigin('https://link-help-git-staging-x.vercel.app')).toContain(
      'vercel.app',
    );
    expect(resolveOAuthReturnOrigin(FLUX_ORIGIN)).toBe(FLUX_ORIGIN);

    const { readFile } = await import('node:fs/promises');
    const { resolve } = await import('node:path');
    const html = await readFile(resolve('index.html'), 'utf8');
    expect(html).toContain("STAGING_HOST = 'teste.linkhelp.app'");
    expect(html).toContain('/manifest-staging.webmanifest');
  });
});
