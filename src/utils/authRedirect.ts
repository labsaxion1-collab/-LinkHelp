import { ROUTES } from '@/utils/constants';

/** Full navigation so post-deploy lazy chunks match index.html (avoids PWA stale chunk errors). */
export function redirectToLoginAfterSignOut(): void {
  window.location.assign(ROUTES.login);
}
