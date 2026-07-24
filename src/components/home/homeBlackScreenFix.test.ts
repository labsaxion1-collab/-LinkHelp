/**
 * Black-screen / home shell deadlock guards (source + unit).
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  diagnoseAccountHomeSnapshot,
  clearAccountHomeSnapshot,
  writeAccountHomeSnapshot,
  writeAccountSessionHint,
  ACCOUNT_SNAPSHOT_SCHEMA_VERSION,
} from '@/utils/accountSessionSnapshot';
import { resolveHomeShellVariant } from '@/components/home/HomeDashboardShellContext';
import { resolveHostProfileFromHostname } from '@/utils/linkhelpHosts';

const memory = new Map<string, string>();

function installSessionStorage() {
  memory.clear();
  // @ts-expect-error test shim
  globalThis.sessionStorage = {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => {
      memory.set(k, v);
    },
    removeItem: (k: string) => {
      memory.delete(k);
    },
    clear: () => memory.clear(),
    key: () => null,
    length: 0,
  };
  // @ts-expect-error test shim
  globalThis.window = globalThis;
}

describe('home shell black-screen guards', () => {
  beforeEach(() => installSessionStorage());
  afterEach(() => clearAccountHomeSnapshot());

  it('resolveHomeShellVariant maps client/helper paths', () => {
    expect(resolveHomeShellVariant('/client/dashboard', 'client')).toBe('client');
    expect(resolveHomeShellVariant('/helper/dashboard', 'helper')).toBe('helper');
    expect(resolveHomeShellVariant('/client/dashboard', null)).toBe('client');
  });

  it('diagnose snapshot reasons without PII', () => {
    expect(diagnoseAccountHomeSnapshot(null)).toBe('missing');
    expect(diagnoseAccountHomeSnapshot('u1')).toBe('missing');

    writeAccountSessionHint({ userId: 'u1', role: 'client' });
    writeAccountHomeSnapshot({
      userId: 'u1',
      role: 'client',
      displayName: 'X',
      homeConfirmed: true,
      heroKey: 'client_novo',
      levelKey: 'novo',
    });
    expect(diagnoseAccountHomeSnapshot('u1')).toBe('accepted');
    expect(diagnoseAccountHomeSnapshot('u1', 'helper')).toBe('role-mismatch');

    memory.set(`lh_account_snapshot_v${ACCOUNT_SNAPSHOT_SCHEMA_VERSION}:u2`, '{bad');
    expect(diagnoseAccountHomeSnapshot('u2')).toBe('invalid-json');

    memory.set(
      `lh_account_snapshot_v${ACCOUNT_SNAPSHOT_SCHEMA_VERSION}:u3`,
      JSON.stringify({
        schemaVersion: 999,
        userId: 'u3',
        role: 'client',
        savedAt: Date.now(),
        homeConfirmedAt: Date.now(),
      }),
    );
    expect(diagnoseAccountHomeSnapshot('u3')).toBe('schema-mismatch');
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
    expect(
      resolveHostProfileFromHostname('app.linkhelp.app', {
        production: true,
        simulatedProfile: 'www',
      }),
    ).toBe('app');
  });
});

describe('black-screen source contracts', () => {
  it('1–3. sessionConfirmed libera Outlet; profileKick não depende de sessionConfirmed', async () => {
    const src = await readFile(resolve('src/components/auth/ProtectedRoute.tsx'), 'utf8');
    expect(src).toContain('return <Outlet />');
    expect(src).toContain('sessionConfirmed');
    expect(src).toMatch(/if \(!authBootstrapped \|\| authLoading \|\| !session\?\.user \|\| profile\) return/);
    expect(src).not.toMatch(/if \(!sessionConfirmed \|\| authLoading \|\| !session\?\.user \|\| profile\) return/);
  });

  it('4–5. dashboard mount marca surfaceReady via useLayoutEffect', async () => {
    const src = await readFile(resolve('src/components/home/HomeDashboardShellContext.tsx'), 'utf8');
    expect(src).toContain('useLayoutEffect');
    expect(src).toContain('markSurfaceReady()');
    expect(src).toContain('homeConfirmed: true');
    expect(src).toContain('HomeShellStuckFallback');
  });

  it('6–8. shell não espera Hero/AppData/gamificação', async () => {
    const src = await readFile(resolve('src/components/home/HomeDashboardShellContext.tsx'), 'utf8');
    expect(src).not.toMatch(/useGamification|fetchRemoteAppDataBootstrap|HeroRankAnimation/);
    expect(src).toContain('SHELL_STUCK_MS');
  });

  it('9–11. generation/account reset e logout limpam superfície', async () => {
    const src = await readFile(resolve('src/components/home/HomeDashboardShellContext.tsx'), 'utf8');
    expect(src).toContain('surfaceGeneration');
    expect(src).toContain('lastUserIdRef');
    expect(src).toContain('familyChanged');
  });

  it('12. snapshot não cobre Home após sessionConfirmed', async () => {
    const protectedSrc = await readFile(resolve('src/components/auth/ProtectedRoute.tsx'), 'utf8');
    expect(protectedSrc).toContain('snapshotVisible && !sessionConfirmed');
    const shell = await readFile(resolve('src/components/home/HomeDashboardShellContext.tsx'), 'utf8');
    expect(shell).toContain('snapshotVisible && !sessionConfirmed');
  });

  it('refreshProfile não zera profile sem user (anti-deadlock login)', async () => {
    const auth = await readFile(resolve('src/context/AuthContext.tsx'), 'utf8');
    expect(auth).toContain('Never wipe a concurrent syncSession profile');
    expect(auth).toContain('Apply session immediately so post-login');
  });

  it('LoginPage passa user explícito ao refreshProfile', async () => {
    const login = await readFile(resolve('src/pages/auth/LoginPage.tsx'), 'utf8');
    expect(login).toContain('refreshProfile(user)');
    expect(login).toContain('window.scrollTo(0, 0)');
  });

  it('13. HostHomeEntry app profile redireciona sem Landing', async () => {
    const host = await readFile(resolve('src/components/routing/HostHomeEntry.tsx'), 'utf8');
    expect(host).toContain("profile === 'app'");
    expect(host).toContain('AppHostHomeRedirect');
  });
});
