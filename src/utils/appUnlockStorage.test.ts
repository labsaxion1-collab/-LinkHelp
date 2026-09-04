import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  APP_UNLOCK_BACKGROUND_TOLERANCE_MS,
  APP_UNLOCK_PREF_PREFIX,
  appUnlockPrefStorageKey,
  clearAppUnlockPreference,
  isSameUnlockUser,
  readAppUnlockPreference,
  shouldLockAfterBackground,
  shouldLockOnColdStart,
  writeAppUnlockPreference,
} from '@/utils/appUnlockStorage';
import { mapPasskeyError, passkeyErrorMessageKey } from '@/utils/passkeyAuth';

describe('appUnlockStorage', () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          store.set(k, v);
        },
        removeItem: (k: string) => {
          store.delete(k);
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('1) session absent → no cold-start lock (login path)', () => {
    expect(shouldLockOnColdStart({ hasSession: false, preferenceEnabled: true })).toBe(false);
  });

  it('2) session present + preference off → opens normally', () => {
    expect(shouldLockOnColdStart({ hasSession: true, preferenceEnabled: false })).toBe(false);
  });

  it('3) session present + preference on + cold start → lock', () => {
    expect(shouldLockOnColdStart({ hasSession: true, preferenceEnabled: true })).toBe(true);
  });

  it('11) background longer than tolerance → lock', () => {
    const hiddenAt = 1_000;
    expect(
      shouldLockAfterBackground({
        preferenceEnabled: true,
        hiddenAtMs: hiddenAt,
        nowMs: hiddenAt + APP_UNLOCK_BACKGROUND_TOLERANCE_MS,
        unlocking: false,
      }),
    ).toBe(true);
  });

  it('12) short background → do not lock', () => {
    const hiddenAt = 1_000;
    expect(
      shouldLockAfterBackground({
        preferenceEnabled: true,
        hiddenAtMs: hiddenAt,
        nowMs: hiddenAt + 3_000,
        unlocking: false,
      }),
    ).toBe(false);
  });

  it('13) events during unlocking → do not lock (no WebAuthn loop)', () => {
    expect(
      shouldLockAfterBackground({
        preferenceEnabled: true,
        hiddenAtMs: 1_000,
        nowMs: 1_000 + APP_UNLOCK_BACKGROUND_TOLERANCE_MS + 1,
        unlocking: true,
      }),
    ).toBe(false);
  });

  it('14) revoking last passkey clears local preference', () => {
    writeAppUnlockPreference('user-a', true);
    clearAppUnlockPreference('user-a');
    expect(readAppUnlockPreference('user-a')).toBe(false);
  });

  it('15) preference of one user does not leak to another', () => {
    expect(appUnlockPrefStorageKey('user-a')).toBe(`${APP_UNLOCK_PREF_PREFIX}user-a`);
    writeAppUnlockPreference('user-a', true);
    writeAppUnlockPreference('user-b', false);
    expect(readAppUnlockPreference('user-a')).toBe(true);
    expect(readAppUnlockPreference('user-b')).toBe(false);
    expect(store.has(`${APP_UNLOCK_PREF_PREFIX}user-b`)).toBe(false);
  });

  it('7) different unlock user is rejected', () => {
    expect(isSameUnlockUser('a', 'a')).toBe(true);
    expect(isSameUnlockUser('a', 'b')).toBe(false);
    expect(isSameUnlockUser(null, 'a')).toBe(false);
  });
});

describe('Passkey unlock error mapping', () => {
  it('maps cancel / credential / expired / network / verification failures', () => {
    expect(mapPasskeyError({ message: 'User cancelled' })).toBe('cancelled');
    expect(mapPasskeyError({ code: 'webauthn_credential_not_found' })).toBe('credential_not_found');
    expect(mapPasskeyError({ code: 'webauthn_challenge_expired' })).toBe('expired');
    expect(mapPasskeyError({ message: 'Failed to fetch' })).toBe('network');
    expect(mapPasskeyError({ message: 'verification failed' })).toBe('error');
    expect(passkeyErrorMessageKey('cancelled')).toContain('cancelled');
    expect(passkeyErrorMessageKey('network')).toBe('app_unlock.error_network');
    expect(passkeyErrorMessageKey('expired')).toBe('app_unlock.error_expired');
    expect(passkeyErrorMessageKey('credential_not_found')).toBe('app_unlock.error_credential');
  });
});

describe('AppUnlockGate contracts', () => {
  const gate = readFileSync(resolve(process.cwd(), 'src/components/auth/AppUnlockGate.tsx'), 'utf8');
  const panel = readFileSync(
    resolve(process.cwd(), 'src/components/auth/PasskeySecurityPanel.tsx'),
    'utf8',
  );
  const protectedRoute = readFileSync(
    resolve(process.cwd(), 'src/components/auth/ProtectedRoute.tsx'),
    'utf8',
  );
  const passkeyAuth = readFileSync(resolve(process.cwd(), 'src/utils/passkeyAuth.ts'), 'utf8');
  const login = readFileSync(resolve(process.cwd(), 'src/pages/auth/LoginPage.tsx'), 'utf8');

  it('4) private content is Outlet only after unlock — locked UI has no Outlet', () => {
    expect(gate).toContain("if (state === 'unlocked')");
    expect(gate).toContain('return <Outlet />');
    expect(gate).toContain('data-testid="app-unlock-locked"');
    expect(gate).toContain('data-testid="app-unlock-checking"');
    // Locked branch must not mount private routes.
    const lockedReturn = gate.slice(gate.indexOf('data-testid="app-unlock-locked"'));
    expect(lockedReturn).not.toContain('<Outlet');
  });

  it('5) unlock button calls signInWithDevicePasskey (real WebAuthn)', () => {
    expect(gate).toContain('signInWithDevicePasskey');
    expect(passkeyAuth).toContain('signInWithPasskey');
    expect(gate).toContain('data-testid="app-unlock-passkey"');
    expect(gate).not.toMatch(/visibilitychange[\s\S]{0,240}signInWithDevicePasskey/);
  });

  it('6+7) success requires same user; mismatch signs out', () => {
    expect(gate).toContain('isSameUnlockUser');
    expect(gate).toContain("setErrorKey('app_unlock.wrong_account')");
    expect(gate).toContain('await signOut()');
    expect(passkeyAuth).toContain('!session || !user?.id');
  });

  it('8+9) cancel/network stay locked and allow retry', () => {
    expect(gate).toContain("setState('locked')");
    expect(gate).toContain("result.code === 'cancelled'");
    expect(gate).toContain('passkeyErrorMessageKey');
    expect(gate).toContain('data-testid="app-unlock-passkey"');
  });

  it('10) other method logs out to traditional login', () => {
    expect(gate).toContain('data-testid="app-unlock-other-method"');
    expect(gate).toContain('handleOtherMethod');
    expect(gate).toContain('ROUTES.login');
  });

  it('14) settings clears preference when last passkey is gone', () => {
    expect(panel).toContain('result.data.length === 0');
    expect(panel).toContain('clearAppUnlockPreference');
    expect(panel).toContain('writeAppUnlockPreference');
    expect(panel).toContain('signInWithDevicePasskey');
    expect(panel).toContain('app-unlock-pref-toggle');
  });

  it('16) listeners registered once with cleanup (no duplicate on state)', () => {
    expect(gate).toContain("addEventListener('visibilitychange'");
    expect(gate).toContain("addEventListener('pagehide'");
    expect(gate).toContain("addEventListener('pageshow'");
    expect(gate).toContain('removeEventListener');
    // Empty deps → single mount subscription; state via refs.
    expect(gate).toMatch(/}, \[\]\);/);
    expect(gate).toContain('stateRef');
    expect(gate).toContain('unlockingRef');
  });

  it('17+18) logout path and existing passkey login remain', () => {
    expect(gate).toContain('signOut');
    expect(login).toContain('signInWithDevicePasskey');
    expect(protectedRoute).toContain('<AppUnlockGate />');
    expect(protectedRoute).toContain('readAppUnlockPreference');
  });

  it('documents privacy-layer limitation (not session encryption)', () => {
    const storage = readFileSync(resolve(process.cwd(), 'src/utils/appUnlockStorage.ts'), 'utf8');
    expect(storage).toMatch(/does NOT encrypt/i);
    expect(gate).toMatch(/Not a substitute for logout/i);
  });
});
