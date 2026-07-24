/**
 * Visual Home snapshot + LinkHelp session hint (SWR paint only).
 * Never stores tokens, email, phone, jobs lists, or messages.
 * Authorization always requires Supabase-confirmed session (sessionConfirmed).
 */

import type { UserType } from '@/types/database';
import type { LevelKey } from '@/gamification/types/gamification';

export const ACCOUNT_SNAPSHOT_SCHEMA_VERSION = 1;
export const ACCOUNT_SNAPSHOT_TTL_MS = 15 * 60 * 1000;

const HINT_KEY = 'lh_session_hint_v1';
const ACTIVE_KEY = 'lh_account_snapshot_active_v1';
const PREFIX = `lh_account_snapshot_v${ACCOUNT_SNAPSHOT_SCHEMA_VERSION}:`;

/** Own hint — written only after Supabase confirms session. No tokens. */
export type AccountSessionHint = {
  schemaVersion: number;
  userId: string;
  role: UserType;
  savedAt: number;
};

/** Minimal visual snapshot for first paint of the same account. */
export type AccountHomeSnapshot = {
  schemaVersion: number;
  userId: string;
  role: UserType;
  displayName: string | null;
  avatarUrl: string | null;
  heroKey: string | null;
  levelKey: LevelKey | null;
  activeJobsCount: number;
  pendingApplicationsCount: number;
  upcomingServicesCount: number;
  homeConfirmedAt: number;
  savedAt: number;
};

function storageKey(userId: string): string {
  return `${PREFIX}${userId}`;
}

function isFresh(savedAt: number, now = Date.now()): boolean {
  return now - savedAt >= 0 && now - savedAt <= ACCOUNT_SNAPSHOT_TTL_MS;
}

function isUserType(value: unknown): value is UserType {
  return value === 'client' || value === 'helper';
}

export function writeAccountSessionHint(input: { userId: string; role: UserType }): void {
  if (typeof window === 'undefined' || !input.userId || !isUserType(input.role)) return;
  try {
    const hint: AccountSessionHint = {
      schemaVersion: ACCOUNT_SNAPSHOT_SCHEMA_VERSION,
      userId: input.userId,
      role: input.role,
      savedAt: Date.now(),
    };
    sessionStorage.setItem(HINT_KEY, JSON.stringify(hint));
  } catch {
    /* ignore */
  }
}

export function readAccountSessionHint(): AccountSessionHint | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(HINT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AccountSessionHint>;
    if (parsed.schemaVersion !== ACCOUNT_SNAPSHOT_SCHEMA_VERSION) {
      sessionStorage.removeItem(HINT_KEY);
      return null;
    }
    if (typeof parsed.userId !== 'string' || !parsed.userId) return null;
    if (!isUserType(parsed.role)) return null;
    if (typeof parsed.savedAt !== 'number' || !isFresh(parsed.savedAt)) {
      sessionStorage.removeItem(HINT_KEY);
      return null;
    }
    return {
      schemaVersion: ACCOUNT_SNAPSHOT_SCHEMA_VERSION,
      userId: parsed.userId,
      role: parsed.role,
      savedAt: parsed.savedAt,
    };
  } catch {
    try {
      sessionStorage.removeItem(HINT_KEY);
    } catch {
      /* ignore */
    }
    return null;
  }
}

export function clearAccountSessionHint(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(HINT_KEY);
  } catch {
    /* ignore */
  }
}

function parseSnapshot(raw: string, expectedUserId: string): AccountHomeSnapshot | null {
  try {
    const parsed = JSON.parse(raw) as Partial<AccountHomeSnapshot>;
    if (parsed.schemaVersion !== ACCOUNT_SNAPSHOT_SCHEMA_VERSION) return null;
    if (parsed.userId !== expectedUserId) return null;
    if (!isUserType(parsed.role)) return null;
    if (typeof parsed.savedAt !== 'number' || !isFresh(parsed.savedAt)) return null;
    if (typeof parsed.homeConfirmedAt !== 'number' || !isFresh(parsed.homeConfirmedAt)) return null;
    return {
      schemaVersion: ACCOUNT_SNAPSHOT_SCHEMA_VERSION,
      userId: expectedUserId,
      role: parsed.role,
      displayName: typeof parsed.displayName === 'string' ? parsed.displayName : null,
      avatarUrl: typeof parsed.avatarUrl === 'string' ? parsed.avatarUrl : null,
      heroKey: typeof parsed.heroKey === 'string' ? parsed.heroKey : null,
      levelKey: (typeof parsed.levelKey === 'string' ? parsed.levelKey : null) as LevelKey | null,
      activeJobsCount: typeof parsed.activeJobsCount === 'number' ? parsed.activeJobsCount : 0,
      pendingApplicationsCount:
        typeof parsed.pendingApplicationsCount === 'number' ? parsed.pendingApplicationsCount : 0,
      upcomingServicesCount:
        typeof parsed.upcomingServicesCount === 'number' ? parsed.upcomingServicesCount : 0,
      homeConfirmedAt: parsed.homeConfirmedAt,
      savedAt: parsed.savedAt,
    };
  } catch {
    return null;
  }
}

export function readAccountHomeSnapshot(userId: string): AccountHomeSnapshot | null {
  if (typeof window === 'undefined' || !userId) return null;
  try {
    const raw = sessionStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const snap = parseSnapshot(raw, userId);
    if (!snap) {
      sessionStorage.removeItem(storageKey(userId));
      return null;
    }
    return snap;
  } catch {
    return null;
  }
}

/** Same-account Home was confirmed recently — visual paint only (not authorization). */
export function hasFreshHomeSnapshotForUser(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return readAccountHomeSnapshot(userId) != null;
}

/** Hint userId only when a matching fresh snapshot exists (safe for visual shell). */
export function readSnapshotVisibleUserId(): string | null {
  const hint = readAccountSessionHint();
  if (!hint) return null;
  if (!hasFreshHomeSnapshotForUser(hint.userId)) return null;
  return hint.userId;
}

export function writeAccountHomeSnapshot(partial: {
  userId: string;
  role: UserType;
  displayName?: string | null;
  avatarUrl?: string | null;
  heroKey?: string | null;
  levelKey?: LevelKey | null;
  activeJobsCount?: number;
  pendingApplicationsCount?: number;
  upcomingServicesCount?: number;
  homeConfirmed?: boolean;
}): void {
  if (typeof window === 'undefined' || !partial.userId || !isUserType(partial.role)) return;
  try {
    const prev = readAccountHomeSnapshot(partial.userId);
    const next: AccountHomeSnapshot = {
      schemaVersion: ACCOUNT_SNAPSHOT_SCHEMA_VERSION,
      userId: partial.userId,
      role: partial.role,
      displayName: partial.displayName !== undefined ? partial.displayName : (prev?.displayName ?? null),
      avatarUrl: partial.avatarUrl !== undefined ? partial.avatarUrl : (prev?.avatarUrl ?? null),
      heroKey: partial.heroKey !== undefined ? partial.heroKey : (prev?.heroKey ?? null),
      levelKey: partial.levelKey !== undefined ? partial.levelKey : (prev?.levelKey ?? null),
      activeJobsCount:
        partial.activeJobsCount !== undefined ? partial.activeJobsCount : (prev?.activeJobsCount ?? 0),
      pendingApplicationsCount:
        partial.pendingApplicationsCount !== undefined
          ? partial.pendingApplicationsCount
          : (prev?.pendingApplicationsCount ?? 0),
      upcomingServicesCount:
        partial.upcomingServicesCount !== undefined
          ? partial.upcomingServicesCount
          : (prev?.upcomingServicesCount ?? 0),
      homeConfirmedAt: partial.homeConfirmed ? Date.now() : (prev?.homeConfirmedAt ?? 0),
      savedAt: Date.now(),
    };
    if (!next.homeConfirmedAt) return;
    sessionStorage.setItem(storageKey(partial.userId), JSON.stringify(next));
    sessionStorage.setItem(ACTIVE_KEY, partial.userId);
    writeAccountSessionHint({ userId: partial.userId, role: partial.role });
  } catch {
    /* quota / private mode */
  }
}

export function clearAccountHomeSnapshot(userId?: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (userId) {
      sessionStorage.removeItem(storageKey(userId));
    } else {
      const active = sessionStorage.getItem(ACTIVE_KEY);
      if (active) sessionStorage.removeItem(storageKey(active));
      for (const key of Object.keys(sessionStorage)) {
        if (key.startsWith('lh_account_snapshot_v')) sessionStorage.removeItem(key);
      }
    }
    const active = sessionStorage.getItem(ACTIVE_KEY);
    if (!userId || active === userId) sessionStorage.removeItem(ACTIVE_KEY);
    const hint = readAccountSessionHint();
    if (!userId || hint?.userId === userId) clearAccountSessionHint();
  } catch {
    /* ignore */
  }
}

/** Test helper — assert hint never carries secrets. */
export function assertHintHasNoSecrets(hint: AccountSessionHint): void {
  const json = JSON.stringify(hint);
  if (/access_token|refresh_token|password|phone|@/i.test(json)) {
    throw new Error('AccountSessionHint must not contain secrets');
  }
}

/** Approximate client Home strip counts — visual only, no job payloads. */
export function computeClientHomeCounts(
  userId: string,
  jobs: { clientId?: string | null; id: string; status: string }[],
  applications: { jobId: string; status: string }[],
  upcomingJobs: { jobId: string }[],
): Pick<AccountHomeSnapshot, 'activeJobsCount' | 'pendingApplicationsCount' | 'upcomingServicesCount'> {
  const clientJobs = jobs.filter((j) => j.clientId === userId);
  const clientJobIds = new Set(clientJobs.map((j) => j.id));
  return {
    activeJobsCount: clientJobs.filter(
      (j) => j.status === 'open' || j.status === 'paused' || j.status === 'in_progress',
    ).length,
    pendingApplicationsCount: applications.filter(
      (a) =>
        (a.status === 'pending' || a.status === 'viewed') && clientJobIds.has(a.jobId),
    ).length,
    upcomingServicesCount: upcomingJobs.filter((u) => clientJobIds.has(u.jobId)).length,
  };
}
