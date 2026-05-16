import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { SupabaseClient } from '@supabase/supabase-js';
import { PageLoader } from '@/components/common/PageLoader';
import { useAuth, type AuthProfile } from '@/context/AuthContext';
import { ROUTES } from '@/utils/constants';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { authFlowLog } from '@/lib/authDebug';
import { resolvePostOAuthPath } from '@/utils/postOAuthRedirect';

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
 * OAuth return: keep the user on this loader until session is resolved — no `/auth/login` redirect
 * during PKCE/implicit URL processing.
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { refreshProfile } = useAuth();
  const next = params.get('next');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const goToLogin = (state: Record<string, unknown>) => {
        if (cancelled) return;
        navigate(ROUTES.login, { replace: true, state });
      };

      if (!isSupabaseConfigured()) {
        goToLogin({ from: ROUTES.home });
        return;
      }

      let sb = getSupabase();
      if (!sb) {
        await new Promise((r) => window.setTimeout(r, 150));
        sb = getSupabase();
      }
      if (!sb) {
        goToLogin({ oauthError: true });
        return;
      }

      try {
        const callbackUrl = typeof window !== 'undefined' ? window.location.href : '';
        const code = callbackUrl ? new URL(callbackUrl).searchParams.get('code') : null;
        const implicitHash =
          typeof window !== 'undefined' &&
          window.location.hash &&
          /access_token|refresh_token|error/.test(window.location.hash);

        if (code) {
          authFlowLog('Auth callback received code', { hasCode: true, origin: window.location.origin });
        }
        if (implicitHash) {
          authFlowLog('Auth callback hash fragment present', { implicit: true });
        }

        await sb.auth.initialize();

        let session = (await sb.auth.getSession()).data.session;

        if (!session && code) {
          authFlowLog('Session exchange (PKCE)', { fromCallbackUrl: callbackUrl.split('?')[0] });
          const { data: exchangeData, error: exchangeErr } = await sb.auth.exchangeCodeForSession(code);
          if (exchangeErr) {
            authFlowLog('exchangeCodeForSession', { message: exchangeErr.message });
          } else if (exchangeData?.session) {
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
          if (typeof window !== 'undefined' && window.location.search.includes('code=')) {
            console.error(
              '[LinkHelp AuthCallback] ?code= present but no session. Use the same origin for OAuth start + callback; redirectTo must be `${window.location.origin}/auth/callback`.',
            );
          }
          if (!(await safeNavigateAwayFromLogin(sb, navigate))) {
            goToLogin({ oauthError: true });
          }
          return;
        }

        authFlowLog('User authenticated', { userId: session.user.id, email: session.user.email });

        let profileRow: AuthProfile | null = null;
        for (let attempt = 0; attempt < 5 && !profileRow; attempt++) {
          if (attempt > 0) {
            await new Promise((r) => window.setTimeout(r, 180 * attempt));
          }
          profileRow = await refreshProfile(session.user);
          if (profileRow) {
            authFlowLog('Profile loaded/created', { userId: profileRow.id, role: profileRow.role });
            break;
          }
        }

        if (cancelled) return;

        const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : null;
        if (safeNext) {
          authFlowLog('Redirecting to dashboard', { path: safeNext, source: 'next param' });
          navigate(safeNext, { replace: true });
          return;
        }

        const dest = resolvePostOAuthPath(profileRow, session.user);
        authFlowLog('Redirecting to dashboard', { path: dest });
        navigate(dest, { replace: true });
      } catch (e) {
        console.error('[LinkHelp AuthCallback] error', e);
        if (!cancelled) {
          const sb2 = getSupabase();
          if (!(await safeNavigateAwayFromLogin(sb2, navigate))) {
            goToLogin({ oauthError: true });
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, next, refreshProfile]);

  return <PageLoader />;
}

