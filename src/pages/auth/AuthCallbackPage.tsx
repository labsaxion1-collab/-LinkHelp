import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { SupabaseClient } from '@supabase/supabase-js';
import { PageLoader } from '@/components/common/PageLoader';
import { useAuth, type AuthProfile } from '@/context/AuthContext';
import { ROUTES } from '@/utils/constants';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { authFlowLog } from '@/lib/authDebug';
import { LINKHELP_DEV_OAUTH_ORIGIN } from '@/utils/oauthRedirect';
import { resolvePostOAuthPath } from '@/utils/postOAuthRedirect';

/**
 * Waits for `getSession()` or `onAuthStateChange` to report a session (or `maxMs`), so we do not
 * navigate away before PKCE persistence and auth listeners have settled.
 */
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
 * OAuth / magic-link return. Finishes PKCE/hash handling via `initialize()` + `getSession()` /
 * optional `exchangeCodeForSession`, waits on auth state, hydrates `profiles`, then redirects.
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { refreshProfile } = useAuth();
  const next = params.get('next');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!isSupabaseConfigured()) {
        navigate(ROUTES.login, { replace: true, state: { from: ROUTES.home } });
        return;
      }

      const sb = getSupabase();
      if (!sb) {
        navigate(ROUTES.login, { replace: true, state: { oauthError: true } });
        return;
      }

      try {
        if (import.meta.env.DEV && typeof window !== 'undefined') {
          console.log('Current origin', window.location.origin);
          if (window.location.origin !== LINKHELP_DEV_OAUTH_ORIGIN) {
            console.warn(
              `[LinkHelp AuthCallback] For PKCE, use ${LINKHELP_DEV_OAUTH_ORIGIN} (npm run dev). Current origin does not match — code_verifier may be missing on return.`,
            );
          }
        }

        const url = new URL(window.location.href);
        const authCode = url.searchParams.get('code');
        if (authCode) {
          authFlowLog('Auth callback received code', { hasCode: true });
        }

        await sb.auth.initialize();

        let session = (await sb.auth.getSession()).data.session;

        if (!session && authCode) {
          const { data: exchangeData, error: exchangeErr } = await sb.auth.exchangeCodeForSession(authCode);
          if (exchangeErr) {
            authFlowLog('exchangeCodeForSession error', { message: exchangeErr.message });
          }
          if (exchangeData?.session) {
            authFlowLog('Session created', { userId: exchangeData.session.user.id });
          }
          session = (await sb.auth.getSession()).data.session;
        }

        if (!session) {
          for (let attempt = 0; attempt < 5 && !session; attempt++) {
            await new Promise((r) => window.setTimeout(r, 120));
            session = (await sb.auth.getSession()).data.session;
          }
        }

        if (session) {
          await waitForAuthSessionSignal(sb, 800);
          session = (await sb.auth.getSession()).data.session;
        } else if (authCode) {
          await waitForAuthSessionSignal(sb, 4000);
          session = (await sb.auth.getSession()).data.session;
        }

        if (cancelled) return;

        if (!session?.user) {
          if (typeof window !== 'undefined' && window.location.search.includes('code=')) {
            console.error(
              '[LinkHelp AuthCallback] ?code= present but no session. Often: PKCE code_verifier missing from localStorage — start and finish Google login on the same origin/port (dev: localhost:3000). Add redirect URLs in Supabase Auth → URL Configuration (production: https://link-help.vercel.app/auth/callback).',
            );
          }
          if (!(await safeNavigateAwayFromLogin(sb, navigate))) {
            navigate(ROUTES.login, { replace: true, state: { oauthError: true } });
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
            navigate(ROUTES.login, { replace: true, state: { oauthError: true } });
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
