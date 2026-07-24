/**
 * Cold-start snapshot security + SWR guards.
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  ACCOUNT_SNAPSHOT_SCHEMA_VERSION,
  ACCOUNT_SNAPSHOT_TTL_MS,
  assertHintHasNoSecrets,
  clearAccountHomeSnapshot,
  computeClientHomeCounts,
  hasFreshHomeSnapshotForUser,
  readAccountHomeSnapshot,
  readAccountSessionHint,
  readSnapshotVisibleUserId,
  writeAccountHomeSnapshot,
  writeAccountSessionHint,
} from '@/utils/accountSessionSnapshot';
import {
  beginGamificationSession,
  commitGamificationSuccess,
  getGamificationSnapshot,
  resetGamificationStoreForTests,
} from '@/gamification/state/gamificationUserStore';
import type { UserGamificationRecord } from '@/gamification/services/gamificationService';
import { EMPTY_GAMIFICATION_STATS } from '@/gamification/services/gamificationStatsAdapter';

const memory = new Map<string, string>();

function installSessionStorage() {
  memory.clear();
  const api = {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => {
      memory.set(k, v);
    },
    removeItem: (k: string) => {
      memory.delete(k);
    },
    clear: () => memory.clear(),
    key: (i: number) => [...memory.keys()][i] ?? null,
    get length() {
      return memory.size;
    },
  };
  // Snapshot now uses localStorage (survives hard refresh).
  // @ts-expect-error test shim
  globalThis.localStorage = api;
  // @ts-expect-error test shim
  globalThis.sessionStorage = api;
  // @ts-expect-error test shim
  globalThis.window = { localStorage: api, sessionStorage: api };
}

function seedHomeSnapshot(userId: string, role: 'client' | 'helper', extra: Record<string, unknown> = {}) {
  writeAccountSessionHint({ userId, role });
  writeAccountHomeSnapshot({
    userId,
    role,
    displayName: role === 'client' ? 'Cliente' : 'Helper',
    avatarUrl: null,
    heroKey: role === 'client' ? 'client_novo' : 'helper_novo',
    levelKey: 'novo',
    homeConfirmed: true,
    ...extra,
  });
}

describe('accountSessionSnapshot — visual paint only', () => {
  beforeEach(() => {
    installSessionStorage();
    resetGamificationStoreForTests();
  });

  afterEach(() => {
    clearAccountHomeSnapshot();
    resetGamificationStoreForTests();
  });

  it('1. snapshot da mesma conta aparece imediatamente via hint+snapshot', () => {
    seedHomeSnapshot('user-a', 'client');
    expect(readSnapshotVisibleUserId()).toBe('user-a');
    expect(hasFreshHomeSnapshotForUser('user-a')).toBe(true);
    const snap = readAccountHomeSnapshot('user-a');
    expect(snap?.heroKey).toBe('client_novo');
    expect(snap?.displayName).toBe('Cliente');
  });

  it('5. conta A nunca aparece para conta B', () => {
    seedHomeSnapshot('user-a', 'client', { displayName: 'Conta A' });
    seedHomeSnapshot('user-b', 'helper', { displayName: 'Conta B' });
    expect(readAccountHomeSnapshot('user-a')?.displayName).toBe('Conta A');
    expect(readAccountHomeSnapshot('user-b')?.displayName).toBe('Conta B');
    clearAccountHomeSnapshot('user-a');
    expect(readAccountHomeSnapshot('user-a')).toBeNull();
    expect(readAccountHomeSnapshot('user-b')?.displayName).toBe('Conta B');
  });

  it('6. logout limpa snapshot e hint', () => {
    seedHomeSnapshot('user-a', 'client');
    clearAccountHomeSnapshot('user-a');
    expect(readAccountHomeSnapshot('user-a')).toBeNull();
    expect(readAccountSessionHint()).toBeNull();
    expect(readSnapshotVisibleUserId()).toBeNull();
  });

  it('7. JSON corrompido é ignorado', () => {
    memory.set(`lh_account_snapshot_v${ACCOUNT_SNAPSHOT_SCHEMA_VERSION}:user-a`, '{not-json');
    expect(readAccountHomeSnapshot('user-a')).toBeNull();
  });

  it('8. snapshot expirado é ignorado', () => {
    seedHomeSnapshot('user-a', 'client');
    const key = `lh_account_snapshot_v${ACCOUNT_SNAPSHOT_SCHEMA_VERSION}:user-a`;
    const parsed = JSON.parse(memory.get(key)!) as { savedAt: number; homeConfirmedAt: number };
    parsed.savedAt = Date.now() - ACCOUNT_SNAPSHOT_TTL_MS - 1;
    parsed.homeConfirmedAt = parsed.savedAt;
    memory.set(key, JSON.stringify(parsed));
    expect(hasFreshHomeSnapshotForUser('user-a')).toBe(false);
  });

  it('9. schemaVersion incompatível é ignorado', () => {
    memory.set(`lh_account_snapshot_v${ACCOUNT_SNAPSHOT_SCHEMA_VERSION}:user-a`, JSON.stringify({
      schemaVersion: 999,
      userId: 'user-a',
      role: 'client',
      savedAt: Date.now(),
      homeConfirmedAt: Date.now(),
    }));
    expect(readAccountHomeSnapshot('user-a')).toBeNull();
  });

  it('10–11. hint próprio não contém tokens nem depende do GoTrue', async () => {
    writeAccountSessionHint({ userId: 'user-a', role: 'client' });
    const hint = readAccountSessionHint()!;
    assertHintHasNoSecrets(hint);
    expect(hint.userId).toBe('user-a');
    expect(hint.schemaVersion).toBe(ACCOUNT_SNAPSHOT_SCHEMA_VERSION);
    const authStorageSrc = await readFile(resolve('src/utils/authStorage.ts'), 'utf8');
    expect(authStorageSrc).not.toContain('readStoredSessionHint');
    expect(authStorageSrc).not.toContain('readStoredAuthUserId');
  });

  it('persiste apenas contagens resumidas — sem listas de jobs', () => {
    seedHomeSnapshot('user-a', 'client', {
      activeJobsCount: 2,
      pendingApplicationsCount: 1,
      upcomingServicesCount: 3,
    });
    const snap = readAccountHomeSnapshot('user-a')!;
    expect(snap.activeJobsCount).toBe(2);
    expect(snap).not.toHaveProperty('jobs');
    expect(snap).not.toHaveProperty('applications');
    expect(snap).not.toHaveProperty('email');
    expect(snap).not.toHaveProperty('profileJson');
  });

  it('computeClientHomeCounts calcula contagens visuais', () => {
    const counts = computeClientHomeCounts(
      'c1',
      [
        { id: 'j1', clientId: 'c1', status: 'open' },
        { id: 'j2', clientId: 'c1', status: 'completed' },
        { id: 'j3', clientId: 'other', status: 'open' },
      ],
      [
        { jobId: 'j1', status: 'pending' },
        { jobId: 'j1', status: 'viewed' },
        { jobId: 'j2', status: 'accepted' },
      ],
      [{ jobId: 'j1' }],
    );
    expect(counts.activeJobsCount).toBe(1);
    expect(counts.pendingApplicationsCount).toBe(2);
    expect(counts.upcomingServicesCount).toBe(1);
  });
});

describe('gamification SWR refresh', () => {
  beforeEach(() => {
    installSessionStorage();
    resetGamificationStoreForTests();
  });

  afterEach(() => {
    resetGamificationStoreForTests();
  });

  it('14. mesmo heroKey não remonta skeleton durante revalidação', () => {
    const record: UserGamificationRecord = {
      userId: 'u1',
      userType: 'client',
      score: 10,
      levelKey: 'novo',
      heroKey: 'client_novo',
      stats: EMPTY_GAMIFICATION_STATS,
      progressPercent: 0,
      pointsToNextLevel: 100,
      missingRequirements: [],
      updatedAt: new Date().toISOString(),
    };
    const gen1 = beginGamificationSession('u1', 'client');
    commitGamificationSuccess('u1', 'client', gen1, record);
    beginGamificationSession('u1', 'client');
    const snap = getGamificationSnapshot('u1', 'client');
    expect(snap.record?.heroKey).toBe('client_novo');
    expect(snap.loading).toBe(false);
  });

  it('15. mudança real de heroKey atualiza snapshot mínimo', () => {
    seedHomeSnapshot('u1', 'client', { heroKey: 'client_novo', levelKey: 'novo' });
    const upgraded: UserGamificationRecord = {
      userId: 'u1',
      userType: 'client',
      score: 50,
      levelKey: 'confiavel',
      heroKey: 'client_confiavel',
      stats: EMPTY_GAMIFICATION_STATS,
      progressPercent: 35,
      pointsToNextLevel: 280,
      missingRequirements: [],
      updatedAt: new Date().toISOString(),
    };
    const gen = beginGamificationSession('u1', 'client');
    commitGamificationSuccess('u1', 'client', gen, upgraded);
    expect(readAccountHomeSnapshot('u1')?.heroKey).toBe('client_confiavel');
  });

  it('hidrata record visual mínimo a partir do snapshot', () => {
    seedHomeSnapshot('u1', 'client', { heroKey: 'client_confiavel', levelKey: 'confiavel' });
    beginGamificationSession('u1', 'client');
    expect(getGamificationSnapshot('u1', 'client').record?.heroKey).toBe('client_confiavel');
    expect(getGamificationSnapshot('u1', 'client').loading).toBe(false);
  });
});

describe('cold start security gates (source)', () => {
  it('2. ProtectedRoute exige sessionConfirmed antes do Outlet', async () => {
    const src = await readFile(resolve('src/components/auth/ProtectedRoute.tsx'), 'utf8');
    expect(src).toContain('sessionConfirmed');
    expect(src).toContain('SnapshotHomeRoutePaint');
    expect(src).not.toContain('hasEstablishedWorkspace');
  });

  it('12–13. AppData e gamification esperam sessionConfirmed', async () => {
    const appData = await readFile(resolve('src/context/AppDataContext.tsx'), 'utf8');
    expect(appData).toContain('sessionConfirmed');
    expect(appData).toContain('useRemote = isSupabaseConfigured() && sessionConfirmed');
    const gamification = await readFile(resolve('src/gamification/hooks/useGamification.ts'), 'utf8');
    expect(gamification).toContain('sessionConfirmed');
  });

  it('3–4. sessão inválida limpa snapshot no AuthContext só com clearCaches', async () => {
    const auth = await readFile(resolve('src/context/AuthContext.tsx'), 'utf8');
    expect(auth).toContain('clearAccountSessionHint');
    expect(auth).toContain('clearCaches: true');
    expect(auth).toContain('do NOT clear visual snapshot on provisional null');
  });

  it('shell esconde com snapshot fresco da mesma conta', async () => {
    const src = await readFile(resolve('src/components/home/HomeDashboardShellContext.tsx'), 'utf8');
    expect(src).toContain('readSnapshotVisibleUserId');
    expect(src).toContain('snapshotVisible');
  });

  it('Hero gate mantém resolvedHeroByKey', async () => {
    const src = await readFile(resolve('src/gamification/hero/GamificationHeroGate.tsx'), 'utf8');
    expect(src).toContain('resolvedHeroByKey');
  });

  it('SnapshotHomePaint bloqueia interação e não mostra créditos', async () => {
    const src = await readFile(resolve('src/components/home/SnapshotHomePaint.tsx'), 'utf8');
    expect(src).toContain('pointer-events-none');
    expect(src).toContain('creditsBalance={null}');
    expect(src).toContain('onCreateRequest={() => {}}');
  });

  it('AuthContext expõe sessionConfirmed e authNetworkPending', async () => {
    const auth = await readFile(resolve('src/context/AuthContext.tsx'), 'utf8');
    expect(auth).toContain('sessionConfirmed');
    expect(auth).toContain('authNetworkPending');
    expect(auth).toContain('snapshotVisible');
    expect(auth).not.toContain('readStoredSessionHint');
  });
});
