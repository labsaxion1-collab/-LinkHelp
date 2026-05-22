const KEEP_SIGNED_IN_KEY = 'linkhelp_keep_signed_in';

export function readKeepSignedIn(): boolean {
  if (typeof window === 'undefined') return true;
  const v = localStorage.getItem(KEEP_SIGNED_IN_KEY);
  if (v === null) return true;
  return v === '1';
}

export function writeKeepSignedIn(keep: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEEP_SIGNED_IN_KEY, keep ? '1' : '0');
}

/** Session-only marker when user opts out of persistent login. */
export const LINKHELP_SESSION_ONLY_KEY = 'linkhelp_session_only';
