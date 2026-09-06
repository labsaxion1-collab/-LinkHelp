/**
 * Local app-unlock preference (privacy UI gate).
 *
 * This does NOT encrypt the Supabase session in localStorage. It only hides
 * private UI until the user re-proves identity via Passkey/WebAuthn.
 * Preference is per user id + this device — never synced across accounts.
 */

export const APP_UNLOCK_PREF_PREFIX = 'linkhelp_app_unlock_pref:';
/** Documented background grace before re-lock (ms). Avoids WebAuthn/file picker flicker. */
export const APP_UNLOCK_BACKGROUND_TOLERANCE_MS = 8_000;

export type AppUnlockGateState =
  | 'checking'
  | 'unlocked'
  | 'locked'
  | 'unlocking'
  | 'error';

export function appUnlockPrefStorageKey(userId: string): string {
  return `${APP_UNLOCK_PREF_PREFIX}${userId}`;
}

export function readAppUnlockPreference(userId: string | null | undefined): boolean {
  if (!userId || typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(appUnlockPrefStorageKey(userId)) === '1';
  } catch {
    return false;
  }
}

export function writeAppUnlockPreference(userId: string, enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    const key = appUnlockPrefStorageKey(userId);
    if (enabled) window.localStorage.setItem(key, '1');
    else window.localStorage.removeItem(key);
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearAppUnlockPreference(userId: string): void {
  writeAppUnlockPreference(userId, false);
}

/** Pure helpers for tests / gate logic (no DOM). */
export function shouldLockOnColdStart(args: {
  hasSession: boolean;
  preferenceEnabled: boolean;
}): boolean {
  return Boolean(args.hasSession && args.preferenceEnabled);
}

export function shouldLockAfterBackground(args: {
  preferenceEnabled: boolean;
  hiddenAtMs: number | null;
  nowMs: number;
  toleranceMs?: number;
  unlocking: boolean;
}): boolean {
  if (!args.preferenceEnabled) return false;
  if (args.unlocking) return false;
  if (args.hiddenAtMs == null) return false;
  const tolerance = args.toleranceMs ?? APP_UNLOCK_BACKGROUND_TOLERANCE_MS;
  return args.nowMs - args.hiddenAtMs >= tolerance;
}

export function isSameUnlockUser(
  lockedUserId: string | null | undefined,
  unlockedUserId: string | null | undefined,
): boolean {
  if (!lockedUserId || !unlockedUserId) return false;
  return lockedUserId === unlockedUserId;
}
