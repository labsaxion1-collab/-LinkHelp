import { describe, expect, it } from 'vitest';
import { ROUTES } from '@/utils/constants';
import { FLUX_HOSTNAME } from '@/utils/fluxHost';
import {
  APP_INTRO_SESSION_KEY,
  introAlreadyPlayedInSession,
  shouldShowAppIntroVideo,
} from '@/utils/appIntroVideo';

function ctx(
  overrides: Partial<{
    hostname: string;
    pathname: string;
    isStandalone: boolean;
    introPlayed: boolean;
  }> = {},
) {
  return {
    hostname: 'www.linkhelp.app',
    pathname: ROUTES.home,
    isStandalone: true,
    introPlayed: false,
    ...overrides,
  };
}

describe('shouldShowAppIntroVideo', () => {
  it('1 PWA standalone + www.linkhelp.app → show', () => {
    expect(shouldShowAppIntroVideo(ctx({ hostname: 'www.linkhelp.app' }))).toBe(true);
  });

  it('2 PWA standalone + linkhelp.app → show', () => {
    expect(shouldShowAppIntroVideo(ctx({ hostname: 'linkhelp.app' }))).toBe(true);
  });

  it('3 browser tab + www.linkhelp.app → hide', () => {
    expect(shouldShowAppIntroVideo(ctx({ hostname: 'www.linkhelp.app', isStandalone: false }))).toBe(
      false,
    );
  });

  it('4 browser tab + linkhelp.app → hide', () => {
    expect(shouldShowAppIntroVideo(ctx({ hostname: 'linkhelp.app', isStandalone: false }))).toBe(
      false,
    );
  });

  it('5 browser tab + flux.linkhelp.app → hide', () => {
    expect(
      shouldShowAppIntroVideo(ctx({ hostname: FLUX_HOSTNAME, isStandalone: false })),
    ).toBe(false);
  });

  it('6 standalone + flux.linkhelp.app → hide', () => {
    expect(
      shouldShowAppIntroVideo(ctx({ hostname: FLUX_HOSTNAME, isStandalone: true })),
    ).toBe(false);
  });

  it('7 Vercel preview in browser tab → hide', () => {
    expect(
      shouldShowAppIntroVideo(
        ctx({
          hostname: 'link-help-git-main-labsaxion1.vercel.app',
          isStandalone: false,
        }),
      ),
    ).toBe(false);
  });

  it('8 localhost in browser tab → hide', () => {
    expect(
      shouldShowAppIntroVideo(ctx({ hostname: 'localhost', isStandalone: false })),
    ).toBe(false);
  });

  it('9 already played in session → hide even on standalone www', () => {
    expect(
      shouldShowAppIntroVideo(
        ctx({ hostname: 'www.linkhelp.app', isStandalone: true, introPlayed: true }),
      ),
    ).toBe(false);
  });

  it('10 /admin/* never shows intro on standalone marketplace host', () => {
    expect(
      shouldShowAppIntroVideo(
        ctx({ hostname: 'www.linkhelp.app', pathname: ROUTES.adminDashboard, isStandalone: true }),
      ),
    ).toBe(false);
    expect(
      shouldShowAppIntroVideo(
        ctx({ hostname: 'www.linkhelp.app', pathname: ROUTES.adminUsers, isStandalone: true }),
      ),
    ).toBe(false);
  });
});

describe('introAlreadyPlayedInSession', () => {
  it('reads session flag', () => {
    const storage = {
      getItem: (key: string) => (key === APP_INTRO_SESSION_KEY ? '1' : null),
    };
    expect(introAlreadyPlayedInSession(storage)).toBe(true);
    expect(introAlreadyPlayedInSession({ getItem: () => null })).toBe(false);
  });
});
