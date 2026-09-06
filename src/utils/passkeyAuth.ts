import { getSupabase } from '@/lib/supabase';

export type PasskeyListItem = {
  id: string;
  friendly_name?: string | null;
  created_at?: string;
  last_used_at?: string | null;
};

export type PasskeyErrorCode =
  | 'not_configured'
  | 'unsupported'
  | 'disabled'
  | 'cancelled'
  | 'duplicate'
  | 'expired'
  | 'credential_not_found'
  | 'network'
  | 'auth_required'
  | 'error';

export type PasskeyResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      code: PasskeyErrorCode;
      message: string;
    };

/** Exported for unit tests — maps WebAuthn/Supabase errors to stable codes. */
export function mapPasskeyError(error: { message?: string; code?: string } | null | undefined): PasskeyErrorCode {
  const code = (error?.code ?? '').toLowerCase();
  const message = (error?.message ?? '').toLowerCase();
  if (code.includes('passkey_disabled') || message.includes('passkey_disabled')) return 'disabled';
  if (code.includes('webauthn_credential_exists') || message.includes('already')) return 'duplicate';
  if (code.includes('webauthn_challenge_expired') || message.includes('expired')) return 'expired';
  if (
    code.includes('webauthn_credential_not_found') ||
    message.includes('credential_not_found') ||
    message.includes('not_found')
  ) {
    return 'credential_not_found';
  }
  if (
    message.includes('failed to fetch') ||
    message.includes('network') ||
    message.includes('offline') ||
    code.includes('network')
  ) {
    return 'network';
  }
  if (
    code.includes('cancel') ||
    message.includes('cancel') ||
    message.includes('not allowed') ||
    message.includes('abort')
  ) {
    return 'cancelled';
  }
  if (message.includes('experimental') || message.includes('opt-in')) return 'disabled';
  return 'error';
}

export function isWebAuthnSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.PublicKeyCredential !== 'undefined' &&
    typeof navigator.credentials?.create === 'function' &&
    typeof navigator.credentials?.get === 'function'
  );
}

type PasskeyAuthClient = {
  registerPasskey?: (opts?: { friendlyName?: string }) => Promise<{ data: PasskeyListItem | null; error: { message?: string; code?: string } | null }>;
  signInWithPasskey?: () => Promise<{ data: { session?: unknown; user?: unknown } | null; error: { message?: string; code?: string } | null }>;
  passkey?: {
    list: () => Promise<{ data: PasskeyListItem[] | null; error: { message?: string; code?: string } | null }>;
    delete: (args: { passkeyId: string }) => Promise<{ error: { message?: string; code?: string } | null }>;
  };
};

function getPasskeyAuth(): PasskeyAuthClient | null {
  const client = getSupabase();
  if (!client) return null;
  return client.auth as unknown as PasskeyAuthClient;
}

export async function registerDevicePasskey(friendlyName?: string): Promise<PasskeyResult<PasskeyListItem>> {
  if (!isWebAuthnSupported()) {
    return { ok: false, code: 'unsupported', message: 'WebAuthn unsupported' };
  }
  const auth = getPasskeyAuth();
  if (!auth?.registerPasskey) {
    return { ok: false, code: 'not_configured', message: 'Passkey API unavailable' };
  }
  const { data, error } = await auth.registerPasskey(friendlyName ? { friendlyName } : undefined);
  if (error || !data) {
    return { ok: false, code: mapPasskeyError(error), message: error?.message ?? 'register failed' };
  }
  return { ok: true, data };
}

export async function signInWithDevicePasskey(): Promise<PasskeyResult<{ userId?: string }>> {
  if (!isWebAuthnSupported()) {
    return { ok: false, code: 'unsupported', message: 'WebAuthn unsupported' };
  }
  const auth = getPasskeyAuth();
  if (!auth?.signInWithPasskey) {
    return { ok: false, code: 'not_configured', message: 'Passkey API unavailable' };
  }
  const { data, error } = await auth.signInWithPasskey();
  if (error) {
    return { ok: false, code: mapPasskeyError(error), message: error.message ?? 'sign-in failed' };
  }
  const session = data?.session;
  const user = data?.user as { id?: string } | undefined;
  // Real unlock requires a verified Supabase session + user (never local UI alone).
  if (!session || !user?.id) {
    return {
      ok: false,
      code: 'error',
      message: 'Passkey verification did not return session and user',
    };
  }
  return { ok: true, data: { userId: user.id } };
}

export async function listDevicePasskeys(): Promise<PasskeyResult<PasskeyListItem[]>> {
  const auth = getPasskeyAuth();
  if (!auth?.passkey?.list) {
    return { ok: false, code: 'not_configured', message: 'Passkey API unavailable' };
  }
  const { data, error } = await auth.passkey.list();
  if (error) {
    return { ok: false, code: mapPasskeyError(error), message: error.message ?? 'list failed' };
  }
  return { ok: true, data: data ?? [] };
}

export async function revokeDevicePasskey(passkeyId: string): Promise<PasskeyResult<true>> {
  const auth = getPasskeyAuth();
  if (!auth?.passkey?.delete) {
    return { ok: false, code: 'not_configured', message: 'Passkey API unavailable' };
  }
  const { error } = await auth.passkey.delete({ passkeyId });
  if (error) {
    return { ok: false, code: mapPasskeyError(error), message: error.message ?? 'delete failed' };
  }
  return { ok: true, data: true };
}

export function passkeyErrorMessageKey(code: PasskeyErrorCode): string {
  switch (code) {
    case 'unsupported':
      return 'app_pages.settings_passkey_unsupported';
    case 'cancelled':
      return 'app_pages.settings_passkey_cancelled';
    case 'disabled':
    case 'not_configured':
      return 'app_pages.settings_passkey_disabled_server';
    case 'expired':
      return 'app_unlock.error_expired';
    case 'credential_not_found':
      return 'app_unlock.error_credential';
    case 'network':
      return 'app_unlock.error_network';
    default:
      return 'app_pages.settings_passkey_error';
  }
}
