import { ROUTES } from '@/utils/constants';
import {
  APP_ORIGIN,
  getCurrentHostProfile,
  isLocalHost,
  isPreviewHost,
} from '@/utils/linkhelpHosts';

const RECOVERY_NEXT_ALLOWLIST = new Set<string>([ROUTES.resetPassword]);

/** Marketplace password recovery must run on the app host. */
export function isPasswordRecoveryPath(pathname: string): boolean {
  return pathname === ROUTES.authConfirm || pathname === ROUTES.resetPassword;
}

/**
 * Canonical origin for Supabase `redirectTo` (production → app.linkhelp.app).
 * Dev/preview use current tab origin.
 */
export function getAppAuthOrigin(): string {
  if (typeof window === 'undefined') return APP_ORIGIN;

  if (import.meta.env.PROD) {
    const hostname = window.location.hostname;
    const profile = getCurrentHostProfile();
    if (profile === 'app') return window.location.origin.replace(/\/+$/, '');
    if (isPreviewHost(hostname) || isLocalHost(hostname)) {
      return window.location.origin.replace(/\/+$/, '');
    }
    return APP_ORIGIN;
  }

  return window.location.origin.replace(/\/+$/, '');
}

/** Supabase Reset Password email should point users here (then template adds token_hash). */
export function buildPasswordRecoveryEmailRedirectUrl(): string {
  const origin = getAppAuthOrigin();
  const next = encodeURIComponent(ROUTES.resetPassword);
  return `${origin}${ROUTES.authConfirm}?type=recovery&next=${next}`;
}

export function sanitizePasswordRecoveryNext(next: string | null | undefined): string {
  const raw = (next ?? '').trim();
  if (RECOVERY_NEXT_ALLOWLIST.has(raw)) return raw;
  return ROUTES.resetPassword;
}

export function isPkceCodeVerifierError(message: string): boolean {
  return /code verifier not found/i.test(message) || /PKCE/i.test(message);
}

export function isRecoveryTokenError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    isPkceCodeVerifierError(message) ||
    m.includes('expired') ||
    m.includes('invalid') ||
    m.includes('otp') ||
    m.includes('token')
  );
}

export type RecoveryErrorKey = 'wrong_browser' | 'invalid_link' | 'generic';

export function classifyRecoveryError(err: unknown): RecoveryErrorKey {
  const message = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
  if (isPkceCodeVerifierError(message)) return 'wrong_browser';
  if (isRecoveryTokenError(message)) return 'invalid_link';
  return 'generic';
}

export function recoveryErrorTranslationKey(kind: RecoveryErrorKey): string {
  switch (kind) {
    case 'wrong_browser':
      return 'auth.reset_wrong_browser';
    case 'invalid_link':
      return 'auth.reset_invalid_link';
    default:
      return 'auth.reset_invalid_link';
  }
}

export async function verifyPasswordRecoveryTokenHash(
  verifyOtp: (params: { token_hash: string; type: 'recovery' }) => Promise<{ error: { message: string } | null }>,
  tokenHash: string,
): Promise<{ error: Error | null }> {
  const { error } = await verifyOtp({ token_hash: tokenHash, type: 'recovery' });
  return { error: error ? new Error(error.message) : null };
}

export async function exchangeRecoveryCodeForSession(
  exchange: (code: string) => Promise<{ error: { message: string } | null }>,
  code: string,
): Promise<{ error: Error | null }> {
  const { error } = await exchange(code);
  return { error: error ? new Error(error.message) : null };
}
