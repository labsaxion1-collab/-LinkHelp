/**
 * Optional Passkey setup invite — per user.id + this device only (no PII).
 * Separate from app-unlock preference: this only tracks “asked / answered”.
 */

export const PASSKEY_INVITE_ANSWERED_PREFIX = 'linkhelp_passkey_invite_answered:';
/** sessionStorage: set only after an interactive login (not session restore). */
export const PASSKEY_INVITE_ELIGIBLE_SESSION_KEY = 'lh_passkey_invite_eligible';

export function passkeyInviteAnsweredStorageKey(userId: string): string {
  return `${PASSKEY_INVITE_ANSWERED_PREFIX}${userId}`;
}

export function readPasskeyInviteAnswered(userId: string | null | undefined): boolean {
  if (!userId || typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(passkeyInviteAnsweredStorageKey(userId)) === '1';
  } catch {
    return false;
  }
}

export function writePasskeyInviteAnswered(userId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(passkeyInviteAnsweredStorageKey(userId), '1');
  } catch {
    /* ignore */
  }
}

/** Call only from interactive login success paths (email / passkey / OAuth callback). */
export function markPasskeyInviteEligibleAfterLogin(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(PASSKEY_INVITE_ELIGIBLE_SESSION_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function consumePasskeyInviteEligibleFlag(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.sessionStorage.getItem(PASSKEY_INVITE_ELIGIBLE_SESSION_KEY);
    if (raw !== '1') return false;
    window.sessionStorage.removeItem(PASSKEY_INVITE_ELIGIBLE_SESSION_KEY);
    return true;
  } catch {
    return false;
  }
}

export function peekPasskeyInviteEligibleFlag(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(PASSKEY_INVITE_ELIGIBLE_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function clearPasskeyInviteEligibleFlag(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(PASSKEY_INVITE_ELIGIBLE_SESSION_KEY);
  } catch {
    /* ignore */
  }
}
