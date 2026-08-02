import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { SupabaseClient } from '@supabase/supabase-js';
import { OAuthConnectingLoader } from '@/components/auth/OAuthConnectingLoader';
import { useAuth, type AuthProfile } from '@/context/AuthContext';
import { ROUTES } from '@/utils/constants';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { authFlowLog, roleFromAuthMetadata, roleRoutingLog } from '@/lib/authDebug';
import {
  clearAdminOAuthState,
  isAdminOAuthFlowPending,
  resolveAdminOAuthReturnTo,
  resolveAuthCallbackDestination,
} from '@/utils/fluxRedirect';
import { acceptAdminInvite } from '@/admin/administrators/acceptAdminInvite';
import { isFluxAdmin } from '@/utils/adminAccess';
import { writeStoredAppMode } from '@/utils/appModeStorage';
import { dashboardPathForRole, normalizeProfileRole } from '@/utils/userRole';
import {
  clearOAuthCallbackActive,
  clearOAuthRedirectPending,
  markOAuthCallbackActive,
} from '@/utils/authStorage';
import { parseOAuthCallbackError, userNeedsRoleSelection } from '@/utils/parseOAuthCallbackError';

async function waitForSessionFromClient(sb: SupabaseClient, maxMs: number): Promise<import('@supabase/supabase-js').Session | null> {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    const { data } = await sb.auth.getSession();
    if (data.session?.user) return data.session;
    await new Promise((r) => window.setTimeout(r, 120));
  }
  return (await sb.auth.getSession()).data.session ?? null;
}

async function waitForAuthBootstrapped(getBootstrapped: () => boolean, maxMs = 8000): Promise<void> {
  const until = Date.now() + maxMs;
  while (Date.now() < until) {
    if (getBootstrapped()) return;
    await new Promise((r) => window.setTimeout(r, 80));
  }
}

function stripAuthParamsFromUrl(): void {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('code') && !url.hash.includes('access_token')) return;
    url.searchParams.delete('code');
    url.searchParams.delete('state');
    const clean = `${url.pathname}${url.search}${url.hash.replace(/access_token=[^&]+&?|refresh_token=[^&]+&?|token_type=[^&]+&?|expires_in=[^&]+&?|provider_token=[^&]+&?|type=[^&]+&?/g, '').replace(/[#&]$/, '')}`;
    window.history.replaceState({}, document.title, clean || url.pathname);
  } catch {
    /* ignore */
  }
}

/**
 * OAuth return: recover session, wait for auth bootstrap, redirect by role or role picker.
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { refreshProfile, authBootstrapped, attemptSessionRecovery } = useAuth();
  const next = params.get('next');
  const bootstrappedRef = useRef(authBootstrapped);
  bootstrappedRef.current = authBootstrapped;
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    let cancelled = false;

    (async () => {
      clearOAuthRedirectPending();

      const goToLogin = (oauthCode?: string) => {
        if (cancelled) return;
        clearOAuthCallbackActive();
        clearOAuthRedirectPending();
        navigate(ROUTES.login, {
          replace: true,
          state: oauthCode ? { oauthError: oauthCode } : { oauthError: 'invalid_session' },
        });
      };

      markOAuthCallbackActive();

      if (!isSupabaseConfigured()) {
        goToLogin('invalid_session');
        return;
      }

      const parsedErr =
        typeof window !== 'undefined' ? parseOAuthCallbackError(window.location.href) : null;
      if (parsedErr) {
        authFlowLog('OAuth callback URL error', parsedErr);
        goToLogin(parsedErr.code);
        return;
      }

      const sb = getSupabase();
      if (!sb) {
        goToLogin('invalid_session');
        return;
      }

      try {
        const callbackUrl = typeof window !== 'undefined' ? window.location.href : '';
        const code = callbackUrl ? new URL(callbackUrl).searchParams.get('code') : null;

        authFlowLog('AuthCallback: processing', {
          hasCode: !!code,
          origin: typeof window !== 'undefined' ? window.location.origin : '',
        });

        await sb.auth.initialize();

        // detectSessionInUrl (PKCE) exchanges the code on initialize/getSession — poll first.
        let session = await waitForSessionFromClient(sb, code ? 6000 : 2500);

        if (!session?.user && code) {
          authFlowLog('AuthCallback: auto-detect missed — trying exchangeCodeForSession', {});
          const { data: exchangeData, error: exchangeErr } = await sb.auth.exchangeCodeForSession(code);
          if (exchangeErr) {
            authFlowLog('exchangeCodeForSession failed', { message: exchangeErr.message });
            session = await waitForSessionFromClient(sb, 2000);
          } else if (exchangeData?.session) {
            authFlowLog('Session created via exchangeCodeForSession', {
              userId: exchangeData.session.user.id,
            });
            session = exchangeData.session;
          }
        }

        if (cancelled) return;

        if (!session?.user) {
          authFlowLog('AuthCallback: no session after PKCE', {});
          goToLogin('invalid_session');
          return;
        }

        const { data: freshSessionData } = await sb.auth.getSession();
        if (freshSessionData.session?.user) {
          session = freshSessionData.session;
        }

        authFlowLog('AuthCallback: session OK', {
          userId: session.user.id,
          email: session.user.email ?? undefined,
          app_metadata_role: session.user.app_metadata?.role ?? null,
          user_metadata_role: session.user.user_metadata?.role ?? session.user.user_metadata?.user_type ?? null,
        });

        stripAuthParamsFromUrl();

        const adminOAuthPending = isAdminOAuthFlowPending() || Boolean(resolveAdminOAuthReturnTo(next));
        if (adminOAuthPending && session.access_token) {
          await acceptAdminInvite(session.access_token);
          const { data: refreshed } = await sb.auth.getSession();
          if (refreshed.session?.user) {
            session = refreshed.session;
          }
        }

        const synced = await attemptSessionRecovery();
        if (!synced) {
          authFlowLog('AuthCallback: session not synced to app context', {});
          goToLogin('invalid_session');
          return;
        }

        await waitForAuthBootstrapped(() => bootstrappedRef.current);

        let profileRow: AuthProfile | null = null;
        if (!adminOAuthPending && !isFluxAdmin(session)) {
          for (let attempt = 0; attempt < 5 && !profileRow; attempt++) {
            if (attempt > 0) {
              await new Promise((r) => window.setTimeout(r, 180 * attempt));
            }
            profileRow = await refreshProfile(session.user);
          }
        } else {
          profileRow = await refreshProfile(session.user);
        }

        if (cancelled) return;

        if (!adminOAuthPending && !isFluxAdmin(session) && userNeedsRoleSelection(session.user, profileRow)) {
          authFlowLog('OAuth user needs role selection', { userId: session.user.id, deleted: Boolean(profileRow?.deleted_at) });
          clearOAuthCallbackActive();
          clearOAuthRedirectPending();
          navigate(ROUTES.dashboard, { replace: true });
          return;
        }

        const role = normalizeProfileRole(profileRow?.role ?? session.user.user_metadata?.user_type);
        if (profileRow?.role === 'client' || profileRow?.role === 'helper') {
          writeStoredAppMode(role, session.user.id);
        }

        const adminReturnResolved = resolveAdminOAuthReturnTo(next);
        const dest = resolveAuthCallbackDestination({
          session,
          nextFromUrl: next,
          profileRole: role,
          hostname: typeof window !== 'undefined' ? window.location.hostname : undefined,
        });
        roleRoutingLog('AuthCallback:redirect', {
          userId: session.user.id,
          email: session.user.email ?? profileRow?.email ?? null,
          role_from_profile: profileRow?.role ?? null,
          role_from_auth: roleFromAuthMetadata(session.user),
          redirect_destination: dest,
          next_from_url: next,
          admin_return_resolved: adminReturnResolved,
          admin_oauth_pending: isAdminOAuthFlowPending(),
          computed_role: role,
        });
        authFlowLog('AuthCallback redirect', {
          dest,
          role,
          dashboard: dashboardPathForRole(role),
          userId: session.user.id,
        });

        clearAdminOAuthState();
        clearOAuthCallbackActive();
        clearOAuthRedirectPending();
        navigate(dest, { replace: true });
      } catch (e) {
        console.error('[LinkHelp AuthCallback] error', e);
        if (!cancelled) {
          goToLogin('invalid_session');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, next, refreshProfile]);

  return <OAuthConnectingLoader />;
}
