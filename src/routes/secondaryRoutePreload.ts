import { importWithRetry } from '@/utils/lazyWithRetry';
import type { ProfileRole } from '@/types/database';

let messagesPromise: Promise<void> | null = null;
let mapPromise: Promise<void> | null = null;
let clientCreditsPromise: Promise<void> | null = null;
let helperCreditsPromise: Promise<void> | null = null;
let helperServicesPromise: Promise<void> | null = null;
let clientSecondaryPromise: Promise<void> | null = null;
let helperSecondaryPromise: Promise<void> | null = null;

function wrapChunk(p: Promise<unknown>): Promise<void> {
  return p.then(() => undefined).catch(() => undefined);
}

export function preloadMessagesRoute(): Promise<void> {
  if (!messagesPromise) {
    messagesPromise = wrapChunk(importWithRetry(() => import('@/pages/chat/MessagesPage')));
  }
  return messagesPromise;
}

export function preloadMapRoute(): Promise<void> {
  if (!mapPromise) {
    mapPromise = wrapChunk(importWithRetry(() => import('@/pages/map/LiveMapPage')));
  }
  return mapPromise;
}

export function preloadClientCreditsRoute(): Promise<void> {
  if (!clientCreditsPromise) {
    clientCreditsPromise = wrapChunk(importWithRetry(() => import('@/pages/client/ClientCreditsPage')));
  }
  return clientCreditsPromise;
}

export function preloadHelperCreditsRoute(): Promise<void> {
  if (!helperCreditsPromise) {
    helperCreditsPromise = wrapChunk(
      importWithRetry(() => import('@/pages/helper/HelperLinkCreditsPage')),
    );
  }
  return helperCreditsPromise;
}

export function preloadHelperServicesRoute(): Promise<void> {
  if (!helperServicesPromise) {
    helperServicesPromise = wrapChunk(
      importWithRetry(() => import('@/pages/helper/HelperUpcomingJobsPage')),
    );
  }
  return helperServicesPromise;
}

/** After Home is interactive — warm secondary shells for the current role only. */
export function preloadSecondaryRoutesForRole(role: ProfileRole): Promise<void> {
  if (role === 'helper') {
    if (!helperSecondaryPromise) {
      helperSecondaryPromise = Promise.all([
        preloadMessagesRoute(),
        preloadMapRoute(),
        preloadHelperCreditsRoute(),
        preloadHelperServicesRoute(),
      ]).then(() => undefined);
    }
    return helperSecondaryPromise;
  }
  if (!clientSecondaryPromise) {
    clientSecondaryPromise = Promise.all([
      preloadMessagesRoute(),
      preloadMapRoute(),
      preloadClientCreditsRoute(),
    ]).then(() => undefined);
  }
  return clientSecondaryPromise;
}

export function resetSecondaryRoutePreloadForTests(): void {
  messagesPromise = null;
  mapPromise = null;
  clientCreditsPromise = null;
  helperCreditsPromise = null;
  helperServicesPromise = null;
  clientSecondaryPromise = null;
  helperSecondaryPromise = null;
}
