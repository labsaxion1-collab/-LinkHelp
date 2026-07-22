import type { UserType } from '@/gamification/types/gamification';
import type { UserGamificationRecord } from '@/gamification/services/gamificationService';

export type GamificationSnapshot = {
  userId: string | null;
  userType: UserType;
  record: UserGamificationRecord | null;
  loading: boolean;
  error: boolean;
  generation: number;
};

type Listener = () => void;

type StoreEntry = {
  snapshot: GamificationSnapshot;
  listeners: Set<Listener>;
  fetchGeneration: number;
  inflightGeneration: number | null;
};

const store = new Map<string, StoreEntry>();

/** React effect ref-count per user/type — one fetch + one realtime channel per key. */
const hookEffectCounts = new Map<string, number>();

export function gamificationStoreKey(userId: string, userType: UserType): string {
  return `${userId}:${userType}`;
}

function getEntry(userId: string, userType: UserType): StoreEntry {
  const key = gamificationStoreKey(userId, userType);
  let entry = store.get(key);
  if (!entry) {
    entry = {
      snapshot: {
        userId,
        userType,
        record: null,
        loading: true,
        error: false,
        generation: 0,
      },
      listeners: new Set(),
      fetchGeneration: 0,
      inflightGeneration: null,
    };
    store.set(key, entry);
  }
  return entry;
}

function notify(entry: StoreEntry) {
  entry.listeners.forEach((listener) => listener());
}

export function getGamificationSnapshot(userId: string, userType: UserType): GamificationSnapshot {
  return getEntry(userId, userType).snapshot;
}

export function subscribeGamification(
  userId: string,
  userType: UserType,
  listener: Listener,
): () => void {
  const entry = getEntry(userId, userType);
  entry.listeners.add(listener);
  return () => entry.listeners.delete(listener);
}

/** Starts a fresh load for this user/type; returns generation token for stale-response guards. */
export function beginGamificationSession(userId: string, userType: UserType): number {
  const entry = getEntry(userId, userType);
  entry.fetchGeneration += 1;
  const generation = entry.fetchGeneration;
  entry.snapshot = {
    userId,
    userType,
    record: null,
    loading: true,
    error: false,
    generation,
  };
  notify(entry);
  return generation;
}

export function isGamificationGenerationCurrent(
  userId: string,
  userType: UserType,
  generation: number,
): boolean {
  const entry = store.get(gamificationStoreKey(userId, userType));
  return Boolean(entry && entry.fetchGeneration === generation);
}

export function commitGamificationSuccess(
  userId: string,
  userType: UserType,
  generation: number,
  record: UserGamificationRecord,
): void {
  const entry = getEntry(userId, userType);
  if (entry.fetchGeneration !== generation) return;
  entry.snapshot = {
    userId,
    userType,
    record,
    loading: false,
    error: false,
    generation,
  };
  notify(entry);
}

export function commitGamificationError(
  userId: string,
  userType: UserType,
  generation: number,
): void {
  const entry = getEntry(userId, userType);
  if (entry.fetchGeneration !== generation) return;
  entry.snapshot = {
    userId,
    userType,
    record: null,
    loading: false,
    error: true,
    generation,
  };
  notify(entry);
}

export function commitGamificationRealtime(
  userId: string,
  userType: UserType,
  record: UserGamificationRecord,
): void {
  const entry = getEntry(userId, userType);
  if (entry.snapshot.userId !== userId) return;
  entry.snapshot = {
    ...entry.snapshot,
    record,
    loading: false,
    error: false,
  };
  notify(entry);
}

export function acquireGamificationHookEffect(
  userId: string,
  userType: UserType,
): { isPrimary: boolean; release: () => void } {
  const key = gamificationStoreKey(userId, userType);
  const next = (hookEffectCounts.get(key) ?? 0) + 1;
  hookEffectCounts.set(key, next);
  return {
    isPrimary: next === 1,
    release: () => {
      const current = hookEffectCounts.get(key) ?? 1;
      const after = current - 1;
      if (after <= 0) hookEffectCounts.delete(key);
      else hookEffectCounts.set(key, after);
    },
  };
}

/** Reuse in-flight fetch after StrictMode remount (same generation, still loading). */
export function getReusableGamificationGeneration(
  userId: string,
  userType: UserType,
): number | null {
  const entry = store.get(gamificationStoreKey(userId, userType));
  if (!entry) return null;
  if (
    entry.snapshot.loading &&
    entry.inflightGeneration !== null &&
    entry.inflightGeneration === entry.fetchGeneration
  ) {
    return entry.fetchGeneration;
  }
  return null;
}

export function markGamificationInflight(
  userId: string,
  userType: UserType,
  generation: number,
): void {
  getEntry(userId, userType).inflightGeneration = generation;
}

export function clearGamificationInflight(
  userId: string,
  userType: UserType,
  generation: number,
): void {
  const entry = store.get(gamificationStoreKey(userId, userType));
  if (entry && entry.inflightGeneration === generation) {
    entry.inflightGeneration = null;
  }
}

export function getGamificationHookEffectCount(userId: string, userType: UserType): number {
  return hookEffectCounts.get(gamificationStoreKey(userId, userType)) ?? 0;
}

const loggedOutSnapshots: Record<UserType, GamificationSnapshot> = {
  client: {
    userId: null,
    userType: 'client',
    record: null,
    loading: false,
    error: false,
    generation: 0,
  },
  helper: {
    userId: null,
    userType: 'helper',
    record: null,
    loading: false,
    error: false,
    generation: 0,
  },
};

export function getLoggedOutGamificationSnapshot(userType: UserType): GamificationSnapshot {
  return loggedOutSnapshots[userType];
}

/** Test-only: reset module state. */
export function resetGamificationStoreForTests(): void {
  store.clear();
  hookEffectCounts.clear();
}
