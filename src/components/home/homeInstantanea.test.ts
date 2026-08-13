/**
 * Home Instantânea — cache seguro, isolamento por conta, gates secundários.
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  ACCOUNT_SNAPSHOT_SCHEMA_VERSION,
  assertHintHasNoSecrets,
  assertSnapshotHasNoSecrets,
  buildHomeFeedPreviews,
  clearAccountHomeSnapshot,
  readAccountHomeSnapshot,
  readAccountSessionHint,
  readSnapshotVisibleUserId,
  writeAccountHomeSnapshot,
  writeAccountSessionHint,
} from '@/utils/accountSessionSnapshot';
import {
  preloadClientDashboard,
  preloadHelperDashboard,
  resetDashboardPreloadForTests,
} from '@/routes/dashboardPreload';
import {
  preloadSecondaryRoutesForRole,
  resetSecondaryRoutePreloadForTests,
} from '@/routes/secondaryRoutePreload';

const memory = new Map<string, string>();

function installLocalStorage() {
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
  // @ts-expect-error test shim
  globalThis.localStorage = api;
  // @ts-expect-error test shim
  globalThis.sessionStorage = api;
  // @ts-expect-error test shim
  globalThis.window = { localStorage: api, sessionStorage: api };
}

function seed(userId: string, role: 'client' | 'helper', extra: Record<string, unknown> = {}) {
  writeAccountSessionHint({ userId, role });
  writeAccountHomeSnapshot({
    userId,
    role,
    displayName: role === 'client' ? 'Cliente' : 'Helper',
    avatarUrl: null,
    heroKey: role === 'client' ? 'client_novo' : 'helper_novo',
    levelKey: 'novo',
    lcBalanceVisual: 42,
    homeConfirmed: true,
    feedPreviews: [
      { id: 'j1', title: 'Limpeza rápida', budgetLabel: '$80', status: 'open' },
      { id: 'j2', title: 'Montagem', budgetLabel: '$50', status: 'open' },
    ],
    ...extra,
  });
}

describe('Home Instantânea — snapshot v2', () => {
  beforeEach(() => {
    installLocalStorage();
    resetDashboardPreloadForTests();
    resetSecondaryRoutePreloadForTests();
  });

  afterEach(() => {
    clearAccountHomeSnapshot();
  });

  it('1. snapshot v2 válido aparece imediatamente', () => {
    seed('user-a', 'client', {
      lcBalanceVisual: 55,
      activeJobsCount: 2,
      pendingApplicationsCount: 1,
      upcomingServicesCount: 0,
    });
    expect(readSnapshotVisibleUserId()).toBe('user-a');
    const snap = readAccountHomeSnapshot('user-a')!;
    expect(snap.schemaVersion).toBe(2);
    expect(snap.heroKey).toBe('client_novo');
    expect(snap.lcBalanceVisual).toBe(55);
    expect(snap.feedPreviews.length).toBeLessThanOrEqual(3);
  });

  it('2. snapshot v1 é invalidado com segurança', () => {
    memory.set(
      'lh_account_snapshot_v1:user-a',
      JSON.stringify({
        schemaVersion: 1,
        userId: 'user-a',
        role: 'client',
        savedAt: Date.now(),
        homeConfirmedAt: Date.now(),
        heroKey: 'client_novo',
        levelKey: 'novo',
      }),
    );
    writeAccountSessionHint({ userId: 'user-a', role: 'client' });
    expect(readAccountHomeSnapshot('user-a')).toBeNull();
    expect(readSnapshotVisibleUserId()).toBeNull();
  });

  it('5. Hero cached aparece com heroKey antes da rede', () => {
    seed('user-a', 'client');
    const snap = readAccountHomeSnapshot('user-a')!;
    expect(snap.heroKey).toBe('client_novo');
    expect(snap.levelKey).toBe('novo');
    expect(readSnapshotVisibleUserId()).toBe('user-a');
  });

  it('6. saldo cached aparece sem flash para zero', () => {
    seed('user-a', 'client', { lcBalanceVisual: 120 });
    expect(readAccountHomeSnapshot('user-a')?.lcBalanceVisual).toBe(120);
    writeAccountHomeSnapshot({
      userId: 'user-a',
      role: 'client',
      displayName: 'Cliente',
    });
    expect(readAccountHomeSnapshot('user-a')?.lcBalanceVisual).toBe(120);
  });

  it('7. cache isolado por userId', () => {
    seed('user-a', 'client', { lcBalanceVisual: 10, displayName: 'A' });
    seed('user-b', 'helper', { lcBalanceVisual: 99, displayName: 'B' });
    expect(readAccountHomeSnapshot('user-a')?.lcBalanceVisual).toBe(10);
    expect(readAccountHomeSnapshot('user-b')?.lcBalanceVisual).toBe(99);
  });

  it('8. logout limpa snapshot', () => {
    seed('user-a', 'client');
    clearAccountHomeSnapshot('user-a');
    expect(readAccountHomeSnapshot('user-a')).toBeNull();
    expect(readAccountSessionHint()).toBeNull();
  });

  it('9. conta B não vê dados da A', () => {
    seed('user-a', 'client', { displayName: 'Conta A', lcBalanceVisual: 11 });
    writeAccountSessionHint({ userId: 'user-b', role: 'helper' });
    expect(readSnapshotVisibleUserId()).toBeNull();
    expect(readAccountHomeSnapshot('user-b')).toBeNull();
    expect(readAccountHomeSnapshot('user-a')?.displayName).toBe('Conta A');
  });

  it('3. snapshot não contém dados proibidos', () => {
    seed('user-a', 'client');
    const snap = readAccountHomeSnapshot('user-a')!;
    assertSnapshotHasNoSecrets(snap);
    assertHintHasNoSecrets(readAccountSessionHint()!);
    expect(snap.feedPreviews).toHaveLength(2);
    expect(snap.schemaVersion).toBe(ACCOUNT_SNAPSHOT_SCHEMA_VERSION);
    expect(JSON.stringify(snap)).not.toMatch(/@|phone|access_token|refresh_token|stripe|sk_live/i);
    expect(snap).not.toHaveProperty('email');
    expect(snap).not.toHaveProperty('jobs');
    expect(snap).not.toHaveProperty('messages');
    expect(snap).not.toHaveProperty('address');
    expect(snap).not.toHaveProperty('transactions');
  });

  it('JSON inválido não quebra o app', () => {
    memory.set(`lh_account_snapshot_v${ACCOUNT_SNAPSHOT_SCHEMA_VERSION}:user-a`, '{not-json');
    writeAccountSessionHint({ userId: 'user-a', role: 'client' });
    expect(readAccountHomeSnapshot('user-a')).toBeNull();
    expect(readSnapshotVisibleUserId()).toBeNull();
  });

  it('buildHomeFeedPreviews limita a 3 e trunca título', () => {
    const previews = buildHomeFeedPreviews(
      Array.from({ length: 5 }, (_, i) => ({
        id: `j${i}`,
        title: `Job ${i} ${'x'.repeat(100)}`,
        status: 'open',
        budgetAmount: 40 + i,
      })),
    );
    expect(previews).toHaveLength(3);
    expect(previews[0].title.length).toBeLessThanOrEqual(80);
    expect(previews[0].budgetLabel).toBe('$40');
  });

  it('12. preload dashboard é idempotente', () => {
    const a = preloadClientDashboard();
    const b = preloadClientDashboard();
    expect(a).toBe(b);
    const h1 = preloadHelperDashboard();
    const h2 = preloadHelperDashboard();
    expect(h1).toBe(h2);
  });

  it('13. preload secundário é idempotente e respeita a role', async () => {
    const src = await readFile(resolve('src/routes/secondaryRoutePreload.ts'), 'utf8');
    expect(src).toContain("role === 'helper'");
    expect(src).toContain('preloadHelperCreditsRoute');
    expect(src).toContain('preloadClientCreditsRoute');
    expect(src).toContain('wrapChunk');
    const p1 = preloadSecondaryRoutesForRole('client');
    const p2 = preloadSecondaryRoutesForRole('client');
    expect(p1).toBe(p2);
    const h1 = preloadSecondaryRoutesForRole('helper');
    const h2 = preloadSecondaryRoutesForRole('helper');
    expect(h1).toBe(h2);
    expect(p1).not.toBe(h1);
  });
});

describe('Home Instantânea — gates e montagem (source)', () => {
  it('1–4 / 6–9. Home monta sem notifications/reviews/nearby/mapa', async () => {
    const client = await readFile(resolve('src/pages/client/ClientDashboard.tsx'), 'utf8');
    const helper = await readFile(resolve('src/pages/helper/HelperDashboard.tsx'), 'utf8');
    const appData = await readFile(resolve('src/context/AppDataContext.tsx'), 'utf8');
    const nearby = await readFile(resolve('src/hooks/useNearbyHelpers.ts'), 'utf8');
    const effect = await readFile(
      resolve('src/components/routing/SecondaryRoutePreloadEffect.tsx'),
      'utf8',
    );

    expect(client).toContain('useMarkHomeDashboardSurfaceReady');
    expect(client).not.toMatch(/if\s*\(.*notifications.*\)\s*return\s+null/);
    expect(client).not.toMatch(/if\s*\(.*nearbyHelpersLoading.*\)\s*return\s+null/);
    expect(client).toContain('enabled: secondaryBlocksReady');
    expect(helper).toContain('useMarkHomeDashboardSurfaceReady');
    expect(helper).toContain('useProgressiveReveal(displayedJobs, 3');
    expect(appData).toContain('scheduleIdle');
    expect(appData).toContain('fetchRemoteNotifications');
    expect(nearby).toContain('enabled?: boolean');
    expect(effect).toContain('surfaceReady');
    expect(effect).toContain('scheduleIdle');
  });

  it('4. saldo cached é somente visual; API prevalece nas mutations', async () => {
    const credits = await readFile(resolve('src/context/CreditContext.tsx'), 'utf8');
    expect(credits).toContain('cachedBalance');
    expect(credits).toContain('wallet != null ? Math.max(0, wallet.balance + optimisticDelta) : cachedBalance');
    expect(credits).toContain('fetchRemoteCreditState');
    expect(credits).toContain('SESSION_UNCONFIRMED');
    expect(credits).not.toMatch(/cachedBalance\s*[<>=].*chargeApplication/);
  });

  it('10. refresh não desmonta Home pronta (shell otimista + snapshot)', async () => {
    const shell = await readFile(resolve('src/components/home/HomeDashboardShellContext.tsx'), 'utf8');
    expect(shell).toContain('readOptimisticHomeSurfaceReady');
    expect(shell).toContain('hasFreshHomeSnapshotForUser');
  });

  it('11 / 16. falha de bloco secundário não derruba Home', async () => {
    const client = await readFile(resolve('src/pages/client/ClientDashboard.tsx'), 'utf8');
    expect(client).toContain('ClientDashboardMapSidebar');
    expect(client).toContain('secondaryBlocksReady');
  });

  it('10–11. primeiro frame ≤3 previews; feed completo depois', async () => {
    const client = await readFile(resolve('src/pages/client/ClientDashboard.tsx'), 'utf8');
    const helper = await readFile(resolve('src/pages/helper/HelperDashboard.tsx'), 'utf8');
    const paint = await readFile(resolve('src/components/home/SnapshotHomePaint.tsx'), 'utf8');
    const progressive = await readFile(resolve('src/hooks/useProgressiveReveal.ts'), 'utf8');
    expect(client).toContain('useProgressiveReveal(activityTabJobs, 3');
    expect(client).toContain('activeClientJobs.slice(0, 3)');
    expect(helper).toContain('progressiveFeedJobs');
    expect(paint).toContain('feedPreviews.slice(0, 3)');
    expect(progressive).toContain('return scheduleIdle');
    expect(progressive).toContain('items.slice(0, initialCount)');
  });

  it('SnapshotHomePaint mostra LC cached mas permanece read-only', async () => {
    const paint = await readFile(resolve('src/components/home/SnapshotHomePaint.tsx'), 'utf8');
    expect(paint).toContain('pointer-events-none');
    expect(paint).toContain('creditsBalance={cachedBalance}');
    expect(paint).toContain('onCreateRequest={() => {}}');
    expect(paint).toContain('balance={cachedBalance}');
  });

  it('5 / 14. mutations de crédito exigem sessionConfirmed', async () => {
    const credits = await readFile(resolve('src/context/CreditContext.tsx'), 'utf8');
    expect(credits).toContain('SESSION_UNCONFIRMED');
    expect(credits).toContain('sessionConfirmed');
    expect(credits).toContain('lcBalanceVisual');
  });

  it('17. mutations AppData continuam atrás de sessionConfirmed', async () => {
    const appData = await readFile(resolve('src/context/AppDataContext.tsx'), 'utf8');
    expect(appData).toContain('useRemote = isSupabaseConfigured() && sessionConfirmed');
  });

  it('schema v2 e campos essenciais presentes', async () => {
    const snap = await readFile(resolve('src/utils/accountSessionSnapshot.ts'), 'utf8');
    expect(snap).toContain('ACCOUNT_SNAPSHOT_SCHEMA_VERSION = 2');
    expect(snap).toContain('lcBalanceVisual');
    expect(snap).toContain('feedPreviews');
    expect(snap).toContain('ACCOUNT_SNAPSHOT_TTL_MS = 15 * 60 * 1000');
  });
});
