import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { SupabaseClient } from '@supabase/supabase-js';
import { PageLoader } from '@/components/common/PageLoader';
import { useAuth } from '@/context/AuthContext';
import { ROUTES } from '@/utils/constants';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { LINKHELP_DEV_OAUTH_ORIGIN } from '@/utils/oauthRedirect';

/**
 * Waits for `getSession()` or `onAuthStateChange` to report a session (or `maxMs`), so we do not
 * navigate away before PKCE persistence and auth listeners have settled.
 */
function waitForAuthSessionSignal(sb: SupabaseClient, maxMs: number): Promise<void> {
  return new Promise((resolve) => {
    let finished = false;
    let timer: ReturnType<typeof window.setTimeout>;
    function done() {
      if (finished) return;
      finished = true;
      window.clearTimeout(timer);
      subscription.unsubscribe();
      resolve();
    }
    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      if (session) done();
    });
    timer = window.setTimeout(() => done(), maxMs);
    void sb.auth.getSession().then(({ data }) => {
      if (data.session) queueMicrotask(done);
    });
  });
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

        await sb.auth.initialize();

        const authCode = new URL(window.location.href).searchParams.get('code');

        let session = (await sb.auth.getSession()).data.session;

        if (!session && authCode) {
          const { error } = await sb.auth.exchangeCodeForSession(authCode);
          if (import.meta.env.DEV && error) {
            console.warn('[LinkHelp AuthCallback] exchangeCodeForSession', error.message);
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

        if (import.meta.env.DEV) {
          console.log('[LinkHelp AuthCallback] after init / exchange / wait', {
            hasSession: !!session,
            userId: session?.user?.id,
            urlHasCode: window.location.search.includes('code='),
          });
        }

        if (cancelled) return;

        if (!session?.user) {
          if (typeof window !== 'undefined' && window.location.search.includes('code=')) {
            console.error(
              '[LinkHelp AuthCallback] ?code= present but no session. Often: PKCE code_verifier missing from localStorage — start and finish Google login on the same origin/port (this app uses port 3000 in package.json; add the same URLs in Supabase Auth → URL Configuration).',
            );
          }
          navigate(ROUTES.login, { replace: true, state: { oauthError: true } });
          return;
        }

        if (import.meta.env.DEV) {
          console.log('[LinkHelp AuthCallback] User authenticated', session.user.id, session.user.email);
        }

        const profileRow = await refreshProfile(session.user);

        if (cancelled) return;

        const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : null;
        if (safeNext) {
          navigate(safeNext, { replace: true });
          return;
        }

        const metaRole = session.user.user_metadata?.user_type;
        const role = profileRow?.role ?? (metaRole === 'helper' ? 'helper' : 'client');
        const dest = role === 'helper' ? ROUTES.helperOpportunities : ROUTES.clientDashboard;
        navigate(dest, { replace: true });
      } catch (e) {
        console.error('[LinkHelp AuthCallback] error', e);
        if (!cancelled) navigate(ROUTES.login, { replace: true, state: { oauthError: true } });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, next, refreshProfile]);

  return <PageLoader />;
}
