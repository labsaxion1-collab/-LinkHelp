/**
 * Visual Home snapshot + LinkHelp session hint (SWR paint only).
 * Uses localStorage so hard refresh / mobile tab restore keep the paint.
 * Never stores tokens, email, phone, full job lists, messages, addresses,
 * or detailed financial records. LC balance is a display integer only.
 * Authorization always requires Supabase-confirmed session (sessionConfirmed).
 */

import type { UserType } from '@/types/database';
import type { LevelKey } from '@/gamification/types/gamification';

export const ACCOUNT_SNAPSHOT_SCHEMA_VERSION = 2;
export const ACCOUNT_SNAPSHOT_TTL_MS = 15 * 60 * 1000;
export const ACCOUNT_HOME_FEED_PREVIEW_LIMIT = 3;

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

/** Safe feed card for first paint — no address, phone, email, or full description. */
export type AccountHomeFeedPreview = {
  id: string;
  title: string;
  budgetLabel: string | null;
  status: string;
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
  /** Display-only LinkCredits integer. Never a ledger or Stripe payload. */
  lcBalanceVisual: number | null;
  activeJobsCount: number;
  pendingApplicationsCount: number;
  upcomingServicesCount: number;
  feedPreviews: AccountHomeFeedPreview[];
  homeConfirmedAt: number;
  savedAt: number;
};

export type SnapshotDiagnoseReason =
  | 'accepted'
  | 'missing-hint'
  | 'missing-snapshot'
  | 'invalid-json'
  | 'expired'
  | 'schema-mismatch'
  | 'user-mismatch'
  | 'role-mismatch'
  | 'missing-home-confirmation'
  | 'invalid-shape';

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

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
  const store = storage();
  if (!store || !input.userId || !isUserType(input.role)) return;
  try {
    const hint: AccountSessionHint = {
      schemaVersion: ACCOUNT_SNAPSHOT_SCHEMA_VERSION,
      userId: input.userId,
      role: input.role,
      savedAt: Date.now(),
    };
    store.setItem(HINT_KEY, JSON.stringify(hint));
  } catch {
    /* ignore */
  }
}

export function readAccountSessionHint(): AccountSessionHint | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(HINT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AccountSessionHint>;
    if (parsed.schemaVersion !== ACCOUNT_SNAPSHOT_SCHEMA_VERSION) {
      store.removeItem(HINT_KEY);
      return null;
    }
    if (typeof parsed.userId !== 'string' || !parsed.userId) return null;
    if (!isUserType(parsed.role)) return null;
    if (typeof parsed.savedAt !== 'number' || !isFresh(parsed.savedAt)) {
      store.removeItem(HINT_KEY);
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
      store.removeItem(HINT_KEY);
    } catch {
      /* ignore */
    }
    return null;
  }
}

export function clearAccountSessionHint(): void {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(HINT_KEY);
  } catch {
    /* ignore */
  }
}

function sanitizePreviewTitle(title: string): string {
  return title.replace(/\s+/g, ' ').trim().slice(0, 80);
}

function parseFeedPreviews(value: unknown): AccountHomeFeedPreview[] {
  if (!Array.isArray(value)) return [];
  const out: AccountHomeFeedPreview[] = [];
  for (const row of value) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Partial<AccountHomeFeedPreview>;
    if (typeof r.id !== 'string' || !r.id) continue;
    if (typeof r.title !== 'string' || !r.title) continue;
    out.push({
      id: r.id.slice(0, 64),
      title: sanitizePreviewTitle(r.title),
      budgetLabel: typeof r.budgetLabel === 'string' ? r.budgetLabel.slice(0, 32) : null,
      status: typeof r.status === 'string' ? r.status.slice(0, 24) : 'open',
    });
    if (out.length >= ACCOUNT_HOME_FEED_PREVIEW_LIMIT) break;
  }
  return out;
}

function parseSnapshot(raw: string, expectedUserId: string): AccountHomeSnapshot | null {
  try {
    const parsed = JSON.parse(raw) as Partial<AccountHomeSnapshot>;
    if (parsed.schemaVersion !== ACCOUNT_SNAPSHOT_SCHEMA_VERSION) return null;
    if (parsed.userId !== expectedUserId) return null;
    if (!isUserType(parsed.role)) return null;
    if (typeof parsed.savedAt !== 'number' || !isFresh(parsed.savedAt)) return null;
    if (typeof parsed.homeConfirmedAt !== 'number' || !isFresh(parsed.homeConfirmedAt)) return null;
    const lc =
      typeof parsed.lcBalanceVisual === 'number' && Number.isFinite(parsed.lcBalanceVisual)
        ? Math.max(0, Math.round(parsed.lcBalanceVisual))
        : null;
    return {
      schemaVersion: ACCOUNT_SNAPSHOT_SCHEMA_VERSION,
      userId: expectedUserId,
      role: parsed.role,
      displayName: typeof parsed.displayName === 'string' ? parsed.displayName : null,
      avatarUrl: typeof parsed.avatarUrl === 'string' ? parsed.avatarUrl : null,
      heroKey: typeof parsed.heroKey === 'string' ? parsed.heroKey : null,
      levelKey: (typeof parsed.levelKey === 'string' ? parsed.levelKey : null) as LevelKey | null,
      lcBalanceVisual: lc,
      activeJobsCount: typeof parsed.activeJobsCount === 'number' ? parsed.activeJobsCount : 0,
      pendingApplicationsCount:
        typeof parsed.pendingApplicationsCount === 'number' ? parsed.pendingApplicationsCount : 0,
      upcomingServicesCount:
        typeof parsed.upcomingServicesCount === 'number' ? parsed.upcomingServicesCount : 0,
      feedPreviews: parseFeedPreviews(parsed.feedPreviews),
      homeConfirmedAt: parsed.homeConfirmedAt,
      savedAt: parsed.savedAt,
    };
  } catch {
    return null;
  }
}

export function readAccountHomeSnapshot(userId: string): AccountHomeSnapshot | null {
  const store = storage();
  if (!store || !userId) return null;
  try {
    const raw = store.getItem(storageKey(userId));
    if (!raw) return null;
    const snap = parseSnapshot(raw, userId);
    if (!snap) {
      store.removeItem(storageKey(userId));
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

/**
 * Full diagnose for Preview/debug — never includes PII.
 * Prefer this over silent null when explaining why paint failed.
 */
export function diagnoseSnapshotRead(expectedRole?: UserType | null): {
  reason: SnapshotDiagnoseReason;
  userIdPrefix: string | null;
  role: UserType | null;
  ageMs: number | null;
  homeConfirmed: boolean;
  storage: 'localStorage';
} {
  const hint = (() => {
    const store = storage();
    if (!store) return null;
    try {
      const raw = store.getItem(HINT_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as Partial<AccountSessionHint>;
    } catch {
      return 'invalid-json' as const;
    }
  })();

  if (hint === 'invalid-json') {
    return {
      reason: 'invalid-json',
      userIdPrefix: null,
      role: null,
      ageMs: null,
      homeConfirmed: false,
      storage: 'localStorage',
    };
  }
  if (!hint || typeof hint !== 'object') {
    return {
      reason: 'missing-hint',
      userIdPrefix: null,
      role: null,
      ageMs: null,
      homeConfirmed: false,
      storage: 'localStorage',
    };
  }
  if (hint.schemaVersion !== ACCOUNT_SNAPSHOT_SCHEMA_VERSION) {
    return {
      reason: 'schema-mismatch',
      userIdPrefix: typeof hint.userId === 'string' ? hint.userId.slice(0, 8) : null,
      role: isUserType(hint.role) ? hint.role : null,
      ageMs: typeof hint.savedAt === 'number' ? Date.now() - hint.savedAt : null,
      homeConfirmed: false,
      storage: 'localStorage',
    };
  }
  if (typeof hint.userId !== 'string' || !hint.userId || !isUserType(hint.role)) {
    return {
      reason: 'invalid-shape',
      userIdPrefix: null,
      role: null,
      ageMs: null,
      homeConfirmed: false,
      storage: 'localStorage',
    };
  }
  if (typeof hint.savedAt !== 'number' || !isFresh(hint.savedAt)) {
    return {
      reason: 'expired',
      userIdPrefix: hint.userId.slice(0, 8),
      role: hint.role,
      ageMs: typeof hint.savedAt === 'number' ? Date.now() - hint.savedAt : null,
      homeConfirmed: false,
      storage: 'localStorage',
    };
  }
  if (expectedRole && hint.role !== expectedRole) {
    return {
      reason: 'role-mismatch',
      userIdPrefix: hint.userId.slice(0, 8),
      role: hint.role,
      ageMs: Date.now() - hint.savedAt,
      homeConfirmed: false,
      storage: 'localStorage',
    };
  }

  const store = storage();
  const raw = store?.getItem(storageKey(hint.userId)) ?? null;
  if (!raw) {
    return {
      reason: 'missing-snapshot',
      userIdPrefix: hint.userId.slice(0, 8),
      role: hint.role,
      ageMs: Date.now() - hint.savedAt,
      homeConfirmed: false,
      storage: 'localStorage',
    };
  }

  let parsed: Partial<AccountHomeSnapshot>;
  try {
    parsed = JSON.parse(raw) as Partial<AccountHomeSnapshot>;
  } catch {
    return {
      reason: 'invalid-json',
      userIdPrefix: hint.userId.slice(0, 8),
      role: hint.role,
      ageMs: Date.now() - hint.savedAt,
      homeConfirmed: false,
      storage: 'localStorage',
    };
  }

  if (parsed.schemaVersion !== ACCOUNT_SNAPSHOT_SCHEMA_VERSION) {
    return {
      reason: 'schema-mismatch',
      userIdPrefix: hint.userId.slice(0, 8),
      role: hint.role,
      ageMs: Date.now() - hint.savedAt,
      homeConfirmed: false,
      storage: 'localStorage',
    };
  }
  if (parsed.userId !== hint.userId) {
    return {
      reason: 'user-mismatch',
      userIdPrefix: hint.userId.slice(0, 8),
      role: hint.role,
      ageMs: Date.now() - hint.savedAt,
      homeConfirmed: false,
      storage: 'localStorage',
    };
  }
  if (!isUserType(parsed.role)) {
    return {
      reason: 'invalid-shape',
      userIdPrefix: hint.userId.slice(0, 8),
      role: hint.role,
      ageMs: Date.now() - hint.savedAt,
      homeConfirmed: false,
      storage: 'localStorage',
    };
  }
  if (expectedRole && parsed.role !== expectedRole) {
    return {
      reason: 'role-mismatch',
      userIdPrefix: hint.userId.slice(0, 8),
      role: parsed.role,
      ageMs: typeof parsed.savedAt === 'number' ? Date.now() - parsed.savedAt : null,
      homeConfirmed: false,
      storage: 'localStorage',
    };
  }
  if (typeof parsed.savedAt !== 'number' || !isFresh(parsed.savedAt)) {
    return {
      reason: 'expired',
      userIdPrefix: hint.userId.slice(0, 8),
      role: parsed.role,
      ageMs: typeof parsed.savedAt === 'number' ? Date.now() - parsed.savedAt : null,
      homeConfirmed: typeof parsed.homeConfirmedAt === 'number',
      storage: 'localStorage',
    };
  }
  if (typeof parsed.homeConfirmedAt !== 'number' || parsed.homeConfirmedAt <= 0) {
    return {
      reason: 'missing-home-confirmation',
      userIdPrefix: hint.userId.slice(0, 8),
      role: parsed.role,
      ageMs: Date.now() - parsed.savedAt,
      homeConfirmed: false,
      storage: 'localStorage',
    };
  }
  if (!isFresh(parsed.homeConfirmedAt)) {
    return {
      reason: 'expired',
      userIdPrefix: hint.userId.slice(0, 8),
      role: parsed.role,
      ageMs: Date.now() - parsed.homeConfirmedAt,
      homeConfirmed: true,
      storage: 'localStorage',
    };
  }

  return {
    reason: 'accepted',
    userIdPrefix: hint.userId.slice(0, 8),
    role: parsed.role,
    ageMs: Date.now() - parsed.savedAt,
    homeConfirmed: true,
    storage: 'localStorage',
  };
}

/** @deprecated use diagnoseSnapshotRead */
export function diagnoseAccountHomeSnapshot(
  userId: string | null | undefined,
  expectedRole?: UserType | null,
): SnapshotDiagnoseReason {
  if (!userId) return 'missing-hint';
  const d = diagnoseSnapshotRead(expectedRole);
  if (d.reason === 'accepted' && d.userIdPrefix && !userId.startsWith(d.userIdPrefix)) {
    return 'user-mismatch';
  }
  if (d.reason === 'missing-hint' || d.reason === 'missing-snapshot') {
    const store = storage();
    if (store?.getItem(storageKey(userId))) {
      const snap = readAccountHomeSnapshot(userId);
      return snap ? 'accepted' : diagnoseSnapshotRead(expectedRole).reason;
    }
  }
  return d.reason === 'missing-hint' && !userId ? 'missing-hint' : d.reason;
}

export function writeAccountHomeSnapshot(partial: {
  userId: string;
  role: UserType;
  displayName?: string | null;
  avatarUrl?: string | null;
  heroKey?: string | null;
  levelKey?: LevelKey | null;
  lcBalanceVisual?: number | null;
  activeJobsCount?: number;
  pendingApplicationsCount?: number;
  upcomingServicesCount?: number;
  feedPreviews?: AccountHomeFeedPreview[];
  homeConfirmed?: boolean;
}): void {
  const store = storage();
  if (!store || !partial.userId || !isUserType(partial.role)) return;
  try {
    const prev = readAccountHomeSnapshot(partial.userId);
    const nextLc =
      partial.lcBalanceVisual !== undefined
        ? partial.lcBalanceVisual == null
          ? null
          : Math.max(0, Math.round(partial.lcBalanceVisual))
        : (prev?.lcBalanceVisual ?? null);
    const next: AccountHomeSnapshot = {
      schemaVersion: ACCOUNT_SNAPSHOT_SCHEMA_VERSION,
      userId: partial.userId,
      role: partial.role,
      displayName: partial.displayName !== undefined ? partial.displayName : (prev?.displayName ?? null),
      avatarUrl: partial.avatarUrl !== undefined ? partial.avatarUrl : (prev?.avatarUrl ?? null),
      heroKey: partial.heroKey !== undefined ? partial.heroKey : (prev?.heroKey ?? null),
      levelKey: partial.levelKey !== undefined ? partial.levelKey : (prev?.levelKey ?? null),
      lcBalanceVisual: nextLc,
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
      feedPreviews:
        partial.feedPreviews !== undefined
          ? parseFeedPreviews(partial.feedPreviews)
          : (prev?.feedPreviews ?? []),
      homeConfirmedAt: partial.homeConfirmed ? Date.now() : (prev?.homeConfirmedAt ?? 0),
      savedAt: Date.now(),
    };
    // Never persist an incomplete first write; never wipe a confirmed snapshot with incomplete data.
    if (!next.homeConfirmedAt) return;
    store.setItem(storageKey(partial.userId), JSON.stringify(next));
    store.setItem(ACTIVE_KEY, partial.userId);
    writeAccountSessionHint({ userId: partial.userId, role: partial.role });
  } catch {
    /* quota / private mode */
  }
}

export function clearAccountHomeSnapshot(userId?: string | null): void {
  const store = storage();
  if (!store) return;
  try {
    if (userId) {
      store.removeItem(storageKey(userId));
    } else {
      const active = store.getItem(ACTIVE_KEY);
      if (active) store.removeItem(storageKey(active));
      const toRemove: string[] = [];
      for (let i = 0; i < store.length; i += 1) {
        const key = store.key(i);
        if (key && key.startsWith('lh_account_snapshot_v')) toRemove.push(key);
      }
      // Also sweep known keys from a Map-backed test shim without length.
      try {
        for (const key of Object.keys(store as unknown as Record<string, unknown>)) {
          if (key.startsWith('lh_account_snapshot_v')) toRemove.push(key);
        }
      } catch {
        /* ignore */
      }
      for (const key of toRemove) store.removeItem(key);
    }
    const active = store.getItem(ACTIVE_KEY);
    if (!userId || active === userId) store.removeItem(ACTIVE_KEY);
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

const TERMINAL_UPCOMING_WORKFLOWS = new Set(['completed', 'auto_completed', 'cancelled']);

/** Approximate client Home strip counts — visual only, no job payloads. */
export function computeClientHomeCounts(
  userId: string,
  jobs: { clientId?: string | null; id: string; status: string }[],
  applications: { jobId: string; status: string }[],
  upcomingJobs: { jobId: string; workflowStatus?: string }[],
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
    upcomingServicesCount: upcomingJobs.filter((u) => {
      if (!clientJobIds.has(u.jobId)) return false;
      if (u.workflowStatus && TERMINAL_UPCOMING_WORKFLOWS.has(u.workflowStatus)) return false;
      return true;
    }).length,
  };
}

/** Up to 3 safe Home feed previews — titles + budget label only. */
export function buildHomeFeedPreviews(
  jobs: {
    id: string;
    title: string;
    status: string;
    budgetAmount?: number | null;
    budgetType?: string | null;
    budgetMin?: number | null;
    budgetMax?: number | null;
  }[],
  limit = ACCOUNT_HOME_FEED_PREVIEW_LIMIT,
): AccountHomeFeedPreview[] {
  return jobs.slice(0, limit).map((job) => {
    let budgetLabel: string | null = null;
    if (typeof job.budgetAmount === 'number' && Number.isFinite(job.budgetAmount)) {
      budgetLabel = `$${Math.round(job.budgetAmount)}`;
    } else if (
      typeof job.budgetMin === 'number' &&
      typeof job.budgetMax === 'number' &&
      Number.isFinite(job.budgetMin) &&
      Number.isFinite(job.budgetMax)
    ) {
      budgetLabel = `$${Math.round(job.budgetMin)}–$${Math.round(job.budgetMax)}`;
    } else if (job.budgetType === 'negotiable') {
      budgetLabel = '—';
    }
    return {
      id: job.id,
      title: sanitizePreviewTitle(job.title),
      budgetLabel,
      status: job.status,
    };
  });
}

/** Assert snapshot JSON never carries prohibited fields (tests / diagnostics). */
export function assertSnapshotHasNoSecrets(snap: AccountHomeSnapshot): void {
  const json = JSON.stringify(snap);
  if (/access_token|refresh_token|password|phone|@|stripe|sk_live|pk_live/i.test(json)) {
    throw new Error('AccountHomeSnapshot must not contain secrets or PII payloads');
  }
  if ('email' in snap || 'jobs' in snap || 'messages' in snap || 'address' in snap) {
    throw new Error('AccountHomeSnapshot must not contain email/jobs/messages/address');
  }
}
