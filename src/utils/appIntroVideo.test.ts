import { describe, expect, it } from 'vitest';
import { ROUTES } from '@/utils/constants';
import { APP_HOSTNAME } from '@/utils/linkhelpHosts';
import { shouldShowAppIntroVideo } from '@/utils/appIntroVideo';
import { FLUX_HOSTNAME } from '@/utils/fluxHost';

function ctx(
  overrides: Partial<{
    hostname: string;
    pathname: string;
    isStandalone: boolean;
    introPlayed: boolean;
  }> = {},
) {
  return {
    hostname: APP_HOSTNAME,
    pathname: ROUTES.home,
    isStandalone: true,
    introPlayed: false,
    ...overrides,
  };
}

describe('shouldShowAppIntroVideo', () => {
  it('PWA standalone + app.linkhelp.app → show', () => {
    expect(shouldShowAppIntroVideo(ctx({ hostname: APP_HOSTNAME }))).toBe(true);
  });

  it('browser tab + app.linkhelp.app → hide', () => {
    expect(shouldShowAppIntroVideo(ctx({ hostname: APP_HOSTNAME, isStandalone: false }))).toBe(
      false,
    );
  });

  it('standalone + www.linkhelp.app → hide', () => {
    expect(shouldShowAppIntroVideo(ctx({ hostname: 'www.linkhelp.app' }))).toBe(false);
  });

  it('standalone + linkhelp.app → hide', () => {
    expect(shouldShowAppIntroVideo(ctx({ hostname: 'linkhelp.app' }))).toBe(false);
  });

  it('browser tab + flux.linkhelp.app → hide', () => {
    expect(
      shouldShowAppIntroVideo(ctx({ hostname: FLUX_HOSTNAME, isStandalone: false })),
    ).toBe(false);
  });

  it('standalone + flux.linkhelp.app → hide', () => {
    expect(
      shouldShowAppIntroVideo(ctx({ hostname: FLUX_HOSTNAME, isStandalone: true })),
    ).toBe(false);
  });

  it('Vercel preview in browser tab → hide', () => {
    expect(
      shouldShowAppIntroVideo(
        ctx({
          hostname: 'link-help-git-main-labsaxion1.vercel.app',
          isStandalone: false,
        }),
      ),
    ).toBe(false);
  });

  it('already played in session → hide even on standalone app', () => {
    expect(
      shouldShowAppIntroVideo(
        ctx({ hostname: APP_HOSTNAME, isStandalone: true, introPlayed: true }),
      ),
    ).toBe(false);
  });

  it('/admin/* never shows intro on standalone app host', () => {
    expect(
      shouldShowAppIntroVideo(
        ctx({ hostname: APP_HOSTNAME, pathname: ROUTES.adminDashboard, isStandalone: true }),
      ),
    ).toBe(false);
  });
});
