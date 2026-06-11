export type OAuthCallbackErrorCode = 'access_denied' | 'popup_closed' | 'invalid_session' | 'generic';

export type ParsedOAuthCallbackError = {
  code: OAuthCallbackErrorCode;
  description?: string;
};

function messageKeyForOAuthCode(code: OAuthCallbackErrorCode): string {
  switch (code) {
    case 'access_denied':
      return 'auth.errors.oauth_access_denied';
    case 'popup_closed':
      return 'auth.errors.oauth_popup_closed';
    case 'invalid_session':
      return 'auth.errors.oauth_invalid_session';
    default:
      return 'auth.errors.oauth_google_short';
  }
}

export function oauthErrorMessageKey(code: OAuthCallbackErrorCode): string {
  return messageKeyForOAuthCode(code);
}

/** Reads Supabase/Google OAuth errors from the callback URL (query or hash). */
export function parseOAuthCallbackError(href: string): ParsedOAuthCallbackError | null {
  try {
    const url = new URL(href);
    const hash = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
    const hashParams = new URLSearchParams(hash);
    const queryParams = url.searchParams;

    const error =
      queryParams.get('error') ||
      hashParams.get('error') ||
      queryParams.get('error_code') ||
      hashParams.get('error_code');
    const description =
      queryParams.get('error_description') ||
      hashParams.get('error_description') ||
      queryParams.get('error_message') ||
      hashParams.get('error_message');

    if (!error) return null;

    const normalized = error.toLowerCase();
    let code: OAuthCallbackErrorCode = 'generic';

    if (
      normalized === 'access_denied' ||
      normalized.includes('denied') ||
      normalized === 'user_cancelled' ||
      normalized === 'user_canceled'
    ) {
      code = 'access_denied';
    } else if (
      normalized === 'popup_closed' ||
      normalized.includes('popup') ||
      normalized === 'interaction_required'
    ) {
      code = 'popup_closed';
    } else if (
      normalized.includes('session') ||
      normalized === 'invalid_request' ||
      normalized === 'server_error'
    ) {
      code = 'invalid_session';
    }

    const desc = description ? decodeURIComponent(description.replace(/\+/g, ' ')) : undefined;
    return { code, description: desc };
  } catch {
    return { code: 'generic' };
  }
}

export function isGoogleOAuthUser(user: { app_metadata?: Record<string, unknown> }): boolean {
  const provider = user.app_metadata?.provider;
  const providers = user.app_metadata?.providers;
  return (
    provider === 'google' ||
    (Array.isArray(providers) && providers.includes('google'))
  );
}

export function userNeedsOAuthRoleSelection(user: {
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
}): boolean {
  if (!isGoogleOAuthUser(user)) return false;
  const raw = user.user_metadata?.user_type;
  return typeof raw !== 'string' || (raw !== 'client' && raw !== 'helper');
}

export function profileIsDeleted(profile: { deleted_at?: string | null } | null | undefined): boolean {
  return Boolean(profile?.deleted_at);
}

/** True when user must pick Client vs Helper (new OAuth signup or re-onboarding after account deletion). */
export function userNeedsRoleSelection(
  user: {
    user_metadata?: Record<string, unknown>;
    app_metadata?: Record<string, unknown>;
  } | null | undefined,
  profile?: { deleted_at?: string | null } | null,
): boolean {
  if (!user) return false;
  if (profileIsDeleted(profile)) return true;
  return userNeedsOAuthRoleSelection(user);
}
