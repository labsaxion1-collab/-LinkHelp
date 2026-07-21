import { isAdminRoute, isFluxHost } from '@/utils/fluxHost';
import { isPwaStandalone, type StandaloneWindow } from '@/utils/pwaRuntime';

export const APP_INTRO_SESSION_KEY = 'lh:intro-played';

export function introAlreadyPlayedInSession(storage?: Pick<Storage, 'getItem'>): boolean {
  try {
    const store = storage ?? (typeof sessionStorage !== 'undefined' ? sessionStorage : null);
    if (!store) return false;
    return store.getItem(APP_INTRO_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function markAppIntroPlayed(storage?: Pick<Storage, 'setItem'>): void {
  try {
    const store = storage ?? (typeof sessionStorage !== 'undefined' ? sessionStorage : null);
    store?.setItem(APP_INTRO_SESSION_KEY, '1');
  } catch {
    /* ignore */
  }
}

export type AppIntroVideoContext = {
  hostname: string;
  pathname: string;
  isStandalone: boolean;
  introPlayed: boolean;
};

/** True only for installed marketplace PWA, not browser tabs or FLUX/admin. */
export function shouldShowAppIntroVideo(ctx: AppIntroVideoContext): boolean {
  if (ctx.introPlayed) return false;
  if (!ctx.isStandalone) return false;
  if (isFluxHost(ctx.hostname)) return false;
  if (isAdminRoute(ctx.pathname)) return false;
  return true;
}

export function readAppIntroVideoContext(
  win?: StandaloneWindow & { location: Location },
): AppIntroVideoContext {
  if (typeof window === 'undefined' && !win) {
    return { hostname: '', pathname: '/', isStandalone: false, introPlayed: false };
  }
  const w = win ?? window;
  return {
    hostname: w.location.hostname,
    pathname: w.location.pathname,
    isStandalone: isPwaStandalone(w),
    introPlayed: introAlreadyPlayedInSession(),
  };
}
