/** Demo persistence for pre-match vs confirmed service (single thread MVP). */

import type { HelperSubscriptionTier } from '@/types/helperSubscription';
import { isUnlimitedPreMatch } from '@/utils/preMatchLimits';

const STORAGE_KEY = 'linkhelp_demo_chat_thread_v1';

export type DemoChatThreadState = {
  serviceConfirmed: boolean;
  clientPreMatchSent: number;
  helperPreMatchSent: number;
};

const defaultState = (): DemoChatThreadState => ({
  serviceConfirmed: false,
  clientPreMatchSent: 0,
  helperPreMatchSent: 0,
});

export function loadDemoChatThread(): DemoChatThreadState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<DemoChatThreadState>;
    return {
      ...defaultState(),
      ...parsed,
    };
  } catch {
    return defaultState();
  }
}

export function saveDemoChatThread(state: DemoChatThreadState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function markDemoServiceConfirmed(): void {
  const s = loadDemoChatThread();
  saveDemoChatThread({ ...s, serviceConfirmed: true });
}

export function incrementDemoPreMatchSent(role: 'client' | 'helper', tier: HelperSubscriptionTier): DemoChatThreadState {
  const s = loadDemoChatThread();
  if (s.serviceConfirmed) return s;
  if (isUnlimitedPreMatch(tier)) return s;
  const next: DemoChatThreadState =
    role === 'client'
      ? { ...s, clientPreMatchSent: s.clientPreMatchSent + 1 }
      : { ...s, helperPreMatchSent: s.helperPreMatchSent + 1 };
  saveDemoChatThread(next);
  return next;
}
