import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { SupabaseClient } from '@supabase/supabase-js';
import { OAuthConnectingLoader } from '@/components/auth/OAuthConnectingLoader';
import { useAuth, type AuthProfile } from '@/context/AuthContext';
import { ROUTES } from '@/utils/constants';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { authFlowLog } from '@/lib/authDebug';
import { resolvePostOAuthPath } from '@/utils/postOAuthRedirect';
import { parseOAuthCallbackError, userNeedsOAuthRoleSelection } from '@/utils/parseOAuthCallbackError';

function waitForAuthSessionSignal(sb: SupabaseClient, maxMs: number): Promise<void> {
  return new Promise((resolve) => {
    let finished = false;
    let timer = 0;
    function done() {
      if (finished) return;
      finished = true;
      window.clearTimeout(timer);
      subscription.unsubscribe();
      resolve();
    }
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_event, session) => {
      if (session) done();
    });
    timer = window.setTimeout(() => done(), maxMs);
    void sb.auth.getSession().then(({ data }) => {
      if (data.session) queueMicrotask(done);
    });
  });
}

async function waitForAuthBootstrapped(
  getBootstrapped: () => boolean,
  maxMs = 8000,
): Promise<void> {
  const until = Date.now() + maxMs;
  while (Date.now() < until) {
    if (getBootstrapped()) return;
    await new Promise((r) => window.setTimeout(r, 80));
  }
}

async function safeNavigateAwayFromLogin(
  sb: SupabaseClient | null,
  navigate: ReturnType<typeof useNavigate>,
): Promise<boolean> {
  if (!sb) return false;
  const s = (await sb.auth.getSession()).data.session;
  if (s?.user) {
    authFlowLog('Session still valid — skipping redirect to login', { userId: s.user.id });
    navigate(ROUTES.dashboard, { replace: true });
    return true;
  }
  return false;
}

/**
 * OAuth return: recover session, wait for auth bootstrap, redirect by role or role picker.
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { refreshProfile, authBootstrapped } = useAuth();
  const next = params.get('next');
  const bootstrappedRef = { current: authBootstrapped };
  bootstrappedRef.current = authBootstrapped;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const goToLogin = (oauthCode?: string) => {
        if (cancelled) return;
        navigate(ROUTES.login, {
          replace: true,
          state: oauthCode ? { oauthError: oauthCode } : { oauthError: 'invalid_session' },
        });
      };

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

      let sb = getSupabase();
      if (!sb) {
        await new Promise((r) => window.setTimeout(r, 150));
        sb = getSupabase();
      }
      if (!sb) {
        goToLogin('invalid_session');
        return;
      }

      try {
        const callbackUrl = typeof window !== 'undefined' ? window.location.href : '';
        const code = callbackUrl ? new URL(callbackUrl).searchParams.get('code') : null;
        const implicitHash =
          typeof window !== 'undefined' &&
          window.location.hash &&
          /access_token|refresh_token|error/.test(window.location.hash);

        await sb.auth.initialize();

        let session = (await sb.auth.getSession()).data.session;

        if (!session && code) {
          const { data: exchangeData, error: exchangeErr } = await sb.auth.exchangeCodeForSession(code);
          if (exchangeErr) {
            authFlowLog('exchangeCodeForSession', { message: exchangeErr.message });
            goToLogin('invalid_session');
            return;
          }
          if (exchangeData?.session) {
            authFlowLog('Session created', { userId: exchangeData.session.user.id });
          }
          session = (await sb.auth.getSession()).data.session;
        }

        const pollUntil = Date.now() + (implicitHash ? 12000 : 8000);
        while (!session && Date.now() < pollUntil) {
          await new Promise((r) => window.setTimeout(r, 280));
          session = (await sb.auth.getSession()).data.session;
          if (session) break;
        }

        if (session) {
          await waitForAuthSessionSignal(sb, 1000);
          session = (await sb.auth.getSession()).data.session;
        } else if (code || implicitHash) {
          await waitForAuthSessionSignal(sb, 4000);
          session = (await sb.auth.getSession()).data.session;
        }

        if (cancelled) return;

        if (!session?.user) {
          if (!(await safeNavigateAwayFromLogin(sb, navigate))) {
            goToLogin('invalid_session');
          }
          return;
        }

        await waitForAuthBootstrapped(() => bootstrappedRef.current);

        let profileRow: AuthProfile | null = null;
        for (let attempt = 0; attempt < 5 && !profileRow; attempt++) {
          if (attempt > 0) {
            await new Promise((r) => window.setTimeout(r, 180 * attempt));
          }
          profileRow = await refreshProfile(session.user);
        }

        if (cancelled) return;

        if (userNeedsOAuthRoleSelection(session.user)) {
          authFlowLog('OAuth user needs role selection', { userId: session.user.id });
          navigate(ROUTES.dashboard, { replace: true });
          return;
        }

        const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : null;
        if (safeNext) {
          navigate(safeNext, { replace: true });
          return;
        }

        const dest = resolvePostOAuthPath(profileRow, session.user);
        navigate(dest, { replace: true });
      } catch (e) {
        console.error('[LinkHelp AuthCallback] error', e);
        if (!cancelled) {
          const sb2 = getSupabase();
          if (!(await safeNavigateAwayFromLogin(sb2, navigate))) {
            goToLogin('invalid_session');
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, next, refreshProfile, authBootstrapped]);

  return <OAuthConnectingLoader />;
}
