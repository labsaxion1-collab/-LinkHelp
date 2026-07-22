import { importWithRetry } from '@/utils/lazyWithRetry';
import type { ProfileRole } from '@/types/database';

let clientPreloadPromise: Promise<void> | null = null;
let helperPreloadPromise: Promise<void> | null = null;

function wrapChunk(p: Promise<unknown>): Promise<void> {
  return p.then(() => undefined).catch(() => undefined);
}

/** Idempotent — starts ClientDashboard chunk download once. */
export function preloadClientDashboard(): Promise<void> {
  if (!clientPreloadPromise) {
    clientPreloadPromise = wrapChunk(importWithRetry(() => import('@/pages/client/ClientDashboard')));
  }
  return clientPreloadPromise;
}

/** Idempotent — starts HelperDashboard chunk download once. */
export function preloadHelperDashboard(): Promise<void> {
  if (!helperPreloadPromise) {
    helperPreloadPromise = wrapChunk(importWithRetry(() => import('@/pages/helper/HelperDashboard')));
  }
  return helperPreloadPromise;
}

export function preloadDashboardForRole(role: ProfileRole): Promise<void> {
  return role === 'helper' ? preloadHelperDashboard() : preloadClientDashboard();
}

/** Test-only reset. */
export function resetDashboardPreloadForTests(): void {
  clientPreloadPromise = null;
  helperPreloadPromise = null;
}
