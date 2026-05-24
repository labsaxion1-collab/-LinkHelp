import { useEffect, useRef, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { PageLoader } from '@/components/common/PageLoader';
import { useAuth } from '@/context/AuthContext';
import { authFlowLog } from '@/lib/authDebug';
import { ROUTES } from '@/utils/constants';

/** Require Supabase env, real session, and a `profiles` row for workspace routes. */
export function ProtectedRoute() {
  const { session, profile, authLoading, authBootstrapped, isConfigured, refreshProfile, attemptSessionRecovery } =
    useAuth();
  const location = useLocation();
  const profileKick = useRef(0);
  const [sessionRecoveryBusy, setSessionRecoveryBusy] = useState(false);
  /** After bootstrap, wait until recovery has run once before sending an unauthenticated user to login. */
  const [sessionRecoveryAttempted, setSessionRecoveryAttempted] = useState(false);

  useEffect(() => {
    authFlowLog('ProtectedRoute: route', {
      path: location.pathname,
      search: location.search,
      authBootstrapped,
      authLoading,
      hasSession: !!session,
      hasProfile: !!profile,
    });
  }, [location.pathname, location.search, authBootstrapped, authLoading, session, profile]);

  useEffect(() => {
    if (session) setSessionRecoveryAttempted(false);
  }, [session]);

  useEffect(() => {
    if (!session?.user) profileKick.current = 0;
  }, [session?.user?.id]);

  useEffect(() => {
    if (!authBootstrapped || authLoading || !session?.user || profile) return;
    if (profileKick.current >= 4) return;
    profileKick.current += 1;
    void refreshProfile(session.user);
  }, [authBootstrapped, authLoading, session, profile, refreshProfile]);

  useEffect(() => {
    setSessionRecoveryAttempted(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isConfigured || !authBootstrapped || authLoading || session) return;

    let cancelled = false;
    setSessionRecoveryBusy(true);
    authFlowLog('ProtectedRoute: session recovery starting', { path: location.pathname });
    void attemptSessionRecovery()
      .then((ok) => {
        authFlowLog('ProtectedRoute: session recovery finished', { path: location.pathname, recovered: ok });
      })
      .catch((e) => {
        authFlowLog('ProtectedRoute: session recovery threw', {
          path: location.pathname,
          message: e instanceof Error ? e.message : String(e),
        });
      })
      .finally(() => {
        if (!cancelled) {
          setSessionRecoveryBusy(false);
          setSessionRecoveryAttempted(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isConfigured, authBootstrapped, authLoading, session, location.pathname, attemptSessionRecovery]);

  if (!isConfigured) {
    authFlowLog('ProtectedRoute: redirect home (Supabase not configured)', { path: location.pathname });
    return <Navigate to={ROUTES.home} replace state={{ needSupabase: true }} />;
  }

  const waitForSessionGate =
    authBootstrapped &&
    !authLoading &&
    !session &&
    (!sessionRecoveryAttempted || sessionRecoveryBusy);

  if (!authBootstrapped || authLoading || sessionRecoveryBusy || waitForSessionGate) {
    return <PageLoader />;
  }

  if (!session) {
    authFlowLog('ProtectedRoute: redirect to login', {
      path: location.pathname,
      reason: 'no_session_after_bootstrap_and_recovery',
    });
    return <Navigate to={ROUTES.login} replace state={{ from: location.pathname }} />;
  }

  if (!profile) {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-sm font-semibold text-slate-700">Não foi possível carregar o seu perfil.</p>
        <button
          type="button"
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-black"
          onClick={() => void refreshProfile()}
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return <Outlet />;
}
