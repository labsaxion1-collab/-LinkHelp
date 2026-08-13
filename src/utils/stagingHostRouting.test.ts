/**
 * Staging host (teste.linkhelp.app) must route like app.linkhelp.app — never Landing.
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { resolveCatchAllInAppTarget, resolveExternalHostRedirect } from '@/utils/hostRouting';
import {
  APEX_HOSTNAME,
  APP_HOSTNAME,
  FLUX_HOSTNAME,
  STAGING_TEST_HOSTNAME,
  WWW_HOSTNAME,
  isAppHost,
  isStagingTestHost,
  resolveHostProfileFromHostname,
  shouldRegisterServiceWorker,
  shouldShowPwaInstallPrompt,
} from '@/utils/linkhelpHosts';
import { ROUTES } from '@/utils/constants';

describe('staging test host → app profile routing', () => {
  it('1. teste.linkhelp.app is classified as app', () => {
    expect(resolveHostProfileFromHostname(STAGING_TEST_HOSTNAME, { production: true })).toBe('app');
    expect(isAppHost(STAGING_TEST_HOSTNAME)).toBe(true);
    expect(isStagingTestHost(STAGING_TEST_HOSTNAME)).toBe(true);
  });

  it('2. HostHomeEntry only lands Landing when profile is not app', async () => {
    const source = await readFile(resolve('src/components/routing/HostHomeEntry.tsx'), 'utf8');
    expect(source).toContain("if (profile === 'app')");
    expect(source).toContain('AppHostHomeRedirect');
    expect(source).toContain('LandingPage');
    // Staging resolves to app → AppHostHomeRedirect path (login / dashboards).
    expect(resolveHostProfileFromHostname(STAGING_TEST_HOSTNAME, { production: true })).toBe('app');
  });

  it('3. teste.linkhelp.app without session → login (catch-all + home redirect contract)', () => {
    expect(resolveCatchAllInAppTarget('app')).toBe(ROUTES.login);
    expect(resolveExternalHostRedirect('app', { pathname: ROUTES.login })).toBeNull();
    expect(resolveExternalHostRedirect('app', { pathname: ROUTES.home })).toBeNull();
  });

  it('4. app.linkhelp.app remains app', () => {
    expect(resolveHostProfileFromHostname(APP_HOSTNAME, { production: true })).toBe('app');
    expect(isAppHost(APP_HOSTNAME)).toBe(true);
  });

  it('5. www and apex remain Landing surfaces (www / combined)', () => {
    expect(resolveHostProfileFromHostname(WWW_HOSTNAME, { production: true })).toBe('www');
    expect(resolveHostProfileFromHostname(APEX_HOSTNAME, { production: true })).toBe('combined');
    expect(resolveCatchAllInAppTarget('www')).toBe(ROUTES.home);
    expect(resolveCatchAllInAppTarget('combined')).toBe(ROUTES.home);
  });

  it('6. flux remains BackOffice profile', () => {
    expect(resolveHostProfileFromHostname(FLUX_HOSTNAME, { production: true })).toBe('flux');
    expect(resolveCatchAllInAppTarget('flux')).toBe(ROUTES.adminDashboard);
  });

  it('7. staging enables PWA install + SW like app; identity script still host-gated', async () => {
    vi.stubGlobal('window', { location: { hostname: STAGING_TEST_HOSTNAME } });
    expect(shouldRegisterServiceWorker()).toBe(true);
    expect(shouldShowPwaInstallPrompt()).toBe(true);
    vi.unstubAllGlobals();

    const html = await readFile(resolve('index.html'), 'utf8');
    expect(html).toContain("STAGING_HOST = 'teste.linkhelp.app'");
    expect(html).toContain('/manifest-staging.webmanifest');
    const manifest = JSON.parse(
      await readFile(resolve('public/manifest-staging.webmanifest'), 'utf8'),
    ) as { name: string; short_name: string; id: string };
    expect(manifest.name).toBe('LinkHelp Teste');
    expect(manifest.short_name).toBe('LH Teste');
    expect(manifest.id).toBe('https://teste.linkhelp.app/');
  });

  it('8. production host constants and VitePWA production manifest remain LinkHelp', async () => {
    expect(APP_HOSTNAME).toBe('app.linkhelp.app');
    expect(WWW_HOSTNAME).toBe('www.linkhelp.app');
    const vite = await readFile(resolve('vite.config.ts'), 'utf8');
    expect(vite).toContain("name: 'LinkHelp'");
    expect(vite).toContain("short_name: 'LinkHelp'");
    expect(vite).toContain("id: '/'");
  });
});
