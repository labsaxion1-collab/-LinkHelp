/**
 * Black-screen / home shell deadlock + snapshot refresh guards.
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  diagnoseSnapshotRead,
  clearAccountHomeSnapshot,
  writeAccountHomeSnapshot,
  writeAccountSessionHint,
  readSnapshotVisibleUserId,
  readAccountHomeSnapshot,
  ACCOUNT_SNAPSHOT_SCHEMA_VERSION,
} from '@/utils/accountSessionSnapshot';
import { resolveHomeShellVariant } from '@/components/home/HomeDashboardShellContext';
import { resolveHostProfileFromHostname } from '@/utils/linkhelpHosts';

const memory = new Map<string, string>();

function installStorage() {
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

describe('home shell black-screen guards', () => {
  beforeEach(() => installStorage());
  afterEach(() => clearAccountHomeSnapshot());

  it('resolveHomeShellVariant maps client/helper paths', () => {
    expect(resolveHomeShellVariant('/client/dashboard', 'client')).toBe('client');
    expect(resolveHomeShellVariant('/helper/dashboard', 'helper')).toBe('helper');
    expect(resolveHomeShellVariant('/client/dashboard', null)).toBe('client');
  });

  it('diagnose snapshot reasons without PII', () => {
    expect(diagnoseSnapshotRead().reason).toBe('missing-hint');

    writeAccountSessionHint({ userId: 'user-aaaa-bbbb', role: 'client' });
    expect(diagnoseSnapshotRead().reason).toBe('missing-snapshot');

    writeAccountHomeSnapshot({
      userId: 'user-aaaa-bbbb',
      role: 'client',
      displayName: 'X',
      homeConfirmed: true,
      heroKey: 'client_novo',
      levelKey: 'novo',
    });
    const ok = diagnoseSnapshotRead();
    expect(ok.reason).toBe('accepted');
    expect(ok.userIdPrefix).toBe('user-aaa');
    expect(ok.storage).toBe('localStorage');
    expect(diagnoseSnapshotRead('helper').reason).toBe('role-mismatch');

    memory.set(`lh_account_snapshot_v${ACCOUNT_SNAPSHOT_SCHEMA_VERSION}:user-bbbb`, '{bad');
    writeAccountSessionHint({ userId: 'user-bbbb', role: 'client' });
    expect(diagnoseSnapshotRead().reason).toBe('invalid-json');
  });

  it('hard-refresh harness: snapshot survives and is accepted before network', () => {
    writeAccountSessionHint({ userId: 'user-cccc-dddd', role: 'client' });
    writeAccountHomeSnapshot({
      userId: 'user-cccc-dddd',
      role: 'client',
      displayName: 'Cliente',
      heroKey: 'client_novo',
      levelKey: 'novo',
      homeConfirmed: true,
      activeJobsCount: 2,
    });
    // Simulate new JS context reading localStorage (same store in test).
    expect(readSnapshotVisibleUserId()).toBe('user-cccc-dddd');
    expect(readAccountHomeSnapshot('user-cccc-dddd')?.heroKey).toBe('client_novo');
    expect(diagnoseSnapshotRead('client').reason).toBe('accepted');
  });

  it('provisional clear must not be implied by AuthContext null sync without clearCaches', async () => {
    const auth = await readFile(resolve('src/context/AuthContext.tsx'), 'utf8');
    expect(auth).toContain('clearCaches');
    expect(auth).toContain('do NOT clear visual snapshot on provisional null');
    expect(auth).toContain('Provisional null before bootstrap finishes');
  });

  it('Preview vercel.app can use VITE app profile without changing production hosts', () => {
    expect(
      resolveHostProfileFromHostname('link-help-git-feature-app-fluidity-p0.vercel.app', {
        production: true,
        simulatedProfile: 'app',
      }),
    ).toBe('app');
    expect(
      resolveHostProfileFromHostname('www.linkhelp.app', {
        production: true,
        simulatedProfile: 'app',
      }),
    ).toBe('www');
  });
});

describe('black-screen source contracts', () => {
  it('sessionConfirmed libera via AppUnlockGate; profileKick não depende de sessionConfirmed', async () => {
    const src = await readFile(resolve('src/components/auth/ProtectedRoute.tsx'), 'utf8');
    expect(src).toContain('return <AppUnlockGate />');
    const gate = await readFile(resolve('src/components/auth/AppUnlockGate.tsx'), 'utf8');
    expect(gate).toContain('return <Outlet />');
    expect(src).toMatch(/if \(!authBootstrapped \|\| authLoading \|\| !session\?\.user \|\| profile\) return/);
  });

  it('dashboard mount marca surfaceReady via useLayoutEffect', async () => {
    const src = await readFile(resolve('src/components/home/HomeDashboardShellContext.tsx'), 'utf8');
    expect(src).toContain('useLayoutEffect');
    expect(src).toContain('markSurfaceReady()');
    expect(src).toContain('HomeShellStuckFallback');
    expect(src).toContain('never leave Navbar + empty light main');
  });

  it('snapshot usa localStorage (não sessionStorage)', async () => {
    const src = await readFile(resolve('src/utils/accountSessionSnapshot.ts'), 'utf8');
    expect(src).toContain('window.localStorage');
    expect(src).not.toMatch(/return window\.sessionStorage/);
  });

  it('index.html evita frame branco e trava scroll no boot', async () => {
    const html = await readFile(resolve('index.html'), 'utf8');
    expect(html).toContain('background: #f4f6fc');
    expect(html).toContain("history.scrollRestoration = 'manual'");
    expect(html).toContain('window.scrollTo(0, 0)');
  });

  it('perfDebug panel disponível', async () => {
    const panel = await readFile(resolve('src/components/dev/PerfDebugPanel.tsx'), 'utf8');
    expect(panel).toContain('perfDebug');
    expect(panel).toContain('diagnoseSnapshotRead');
    const app = await readFile(resolve('src/App.tsx'), 'utf8');
    expect(app).toContain('PerfDebugPanel');
  });

  it('LoginPage passa user explícito ao refreshProfile', async () => {
    const login = await readFile(resolve('src/pages/auth/LoginPage.tsx'), 'utf8');
    expect(login).toContain('refreshProfile(user)');
  });
});
