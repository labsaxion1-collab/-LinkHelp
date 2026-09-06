import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  PASSKEY_INVITE_ANSWERED_PREFIX,
  PASSKEY_INVITE_ELIGIBLE_SESSION_KEY,
  clearPasskeyInviteEligibleFlag,
  consumePasskeyInviteEligibleFlag,
  markPasskeyInviteEligibleAfterLogin,
  passkeyInviteAnsweredStorageKey,
  peekPasskeyInviteEligibleFlag,
  readPasskeyInviteAnswered,
  writePasskeyInviteAnswered,
} from '@/utils/passkeyInviteStorage';

describe('passkeyInviteStorage', () => {
  const local = new Map<string, string>();
  const session = new Map<string, string>();

  beforeEach(() => {
    local.clear();
    session.clear();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (k: string) => local.get(k) ?? null,
        setItem: (k: string, v: string) => {
          local.set(k, v);
        },
        removeItem: (k: string) => {
          local.delete(k);
        },
      },
      sessionStorage: {
        getItem: (k: string) => session.get(k) ?? null,
        setItem: (k: string, v: string) => {
          session.set(k, v);
        },
        removeItem: (k: string) => {
          session.delete(k);
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('scopes answered preference by user id without PII', () => {
    expect(passkeyInviteAnsweredStorageKey('u1')).toBe(`${PASSKEY_INVITE_ANSWERED_PREFIX}u1`);
    writePasskeyInviteAnswered('u1');
    expect(readPasskeyInviteAnswered('u1')).toBe(true);
    expect(readPasskeyInviteAnswered('u2')).toBe(false);
  });

  it('interactive login flag is session-only and consumable once', () => {
    expect(peekPasskeyInviteEligibleFlag()).toBe(false);
    markPasskeyInviteEligibleAfterLogin();
    expect(session.get(PASSKEY_INVITE_ELIGIBLE_SESSION_KEY)).toBe('1');
    expect(peekPasskeyInviteEligibleFlag()).toBe(true);
    expect(consumePasskeyInviteEligibleFlag()).toBe(true);
    expect(peekPasskeyInviteEligibleFlag()).toBe(false);
    expect(consumePasskeyInviteEligibleFlag()).toBe(false);
  });

  it('clear removes eligible flag without answering', () => {
    markPasskeyInviteEligibleAfterLogin();
    clearPasskeyInviteEligibleFlag();
    expect(peekPasskeyInviteEligibleFlag()).toBe(false);
    expect(readPasskeyInviteAnswered('u1')).toBe(false);
  });
});

describe('PasskeyInvitePrompt contracts', () => {
  const prompt = readFileSync(
    resolve(process.cwd(), 'src/components/auth/PasskeyInvitePrompt.tsx'),
    'utf8',
  );
  const login = readFileSync(resolve(process.cwd(), 'src/pages/auth/LoginPage.tsx'), 'utf8');
  const callback = readFileSync(
    resolve(process.cwd(), 'src/pages/auth/AuthCallbackPage.tsx'),
    'utf8',
  );
  const gate = readFileSync(resolve(process.cwd(), 'src/components/auth/AppUnlockGate.tsx'), 'utf8');

  it('wires invite after interactive login only (not session restore effect)', () => {
    expect(login).toContain('markPasskeyInviteEligibleAfterLogin');
    expect(callback).toContain('markPasskeyInviteEligibleAfterLogin');
    // Restore redirect path must not mark eligibility.
    const restoreBlock = login.slice(
      login.indexOf('if (!session?.user) return;'),
      login.indexOf('const handleSubmit'),
    );
    expect(restoreBlock).toContain('goAfterLogin(session.user.id)');
    expect(restoreBlock).not.toContain('markPasskeyInviteEligibleAfterLogin');
  });

  it('shows real register flow and never blocks on cancel/error', () => {
    expect(prompt).toContain('registerDevicePasskey');
    expect(prompt).toContain('listDevicePasskeys');
    expect(prompt).toContain('isWebAuthnSupported');
    expect(prompt).toContain('passkey-invite-later');
    expect(prompt).toContain('writePasskeyInviteAnswered');
    expect(prompt).toContain("result.code === 'cancelled'");
  });

  it('mounts only when unlocked (never on AppUnlock lock screen)', () => {
    expect(gate).toContain('PasskeyInvitePrompt');
    expect(gate).toContain("state === 'unlocked'");
  });

  it('skips when passkeys already exist (no duplicate credential)', () => {
    expect(prompt).toContain('listed.data.length > 0');
    expect(prompt).toContain('writePasskeyInviteAnswered(userId)');
  });
});
