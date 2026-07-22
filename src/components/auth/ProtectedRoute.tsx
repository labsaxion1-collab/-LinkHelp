import { useEffect, useRef, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthSessionBootstrapFallback } from '@/components/home/AuthSessionBootstrapFallback';
import { HomeDashboardRoutePlaceholder } from '@/components/home/HomeDashboardShellContext';
import { AppShellGenericSkeleton } from '@/components/home/AppShellGenericSkeleton';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { authFlowLog, roleFromAuthMetadata, roleRoutingLog } from '@/lib/authDebug';
import { ROUTES } from '@/utils/constants';
import { isAuthCallbackPath } from '@/utils/authStorage';
import { isAppShellPath } from '@/utils/navigation';
import { isAuthenticatedHomeDashboardPath } from '@/utils/homeDashboardPaths';
import { getAuthLoginPathForRoute, sanitizeReturnTo } from '@/utils/fluxRedirect';
import type { ReactNode } from 'react';

function protectedRoutePlaceholder(pathname: string, hasSession: boolean): ReactNode {
  if (isAuthenticatedHomeDashboardPath(pathname)) {
    return <HomeDashboardRoutePlaceholder />;
  }
  if (!isAppShellPath(pathname)) {
    return <AuthSessionBootstrapFallback />;
  }
  if (hasSession) {
    return <AppShellGenericSkeleton />;
  }
  return <AuthSessionBootstrapFallback />;
}

/** Require Supabase env, real session, and a `profiles` row for workspace routes. */
export function ProtectedRoute() {
  const { t } = useLanguage();
  const { session, profile, authLoading, authBootstrapped, isConfigured, refreshProfile, attemptSessionRecovery } =
    useAuth();
  const location = useLocation();
  const profileKick = useRef(0);
  const [sessionRecoveryBusy, setSessionRecoveryBusy] = useState(false);
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
    if (isAuthCallbackPath(location.pathname) || location.pathname === ROUTES.login) return;
    if (location.pathname === ROUTES.adminLogin) return;

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

  const hasEstablishedWorkspace = Boolean(session && profile);
  const showBlockingLoader =
    !authBootstrapped ||
    sessionRecoveryBusy ||
    waitForSessionGate ||
    (authLoading && !hasEstablishedWorkspace);

  if (showBlockingLoader) {
    return protectedRoutePlaceholder(location.pathname, Boolean(session?.user));
  }

  if (!session) {
    const returnPath = sanitizeReturnTo(`${location.pathname}${location.search}`) ?? location.pathname;
    const loginTarget = getAuthLoginPathForRoute(location.pathname, returnPath);
    authFlowLog('ProtectedRoute: redirect to login', {
      path: location.pathname,
      reason: 'no_session_after_bootstrap_and_recovery',
      loginTarget,
    });
    return (
      <Navigate
        to={loginTarget}
        replace
        state={{ from: returnPath }}
      />
    );
  }

  if (!profile) {
    roleRoutingLog('ProtectedRoute:profile_missing', {
      userId: session.user.id,
      email: session.user.email ?? null,
      role_from_profile: null,
      role_from_auth: roleFromAuthMetadata(session.user),
      redirect_destination: null,
      path: location.pathname,
    });
    authFlowLog('ProtectedRoute blocked — profile missing', {
      path: location.pathname,
      userId: session.user.id,
      reason: 'profile_not_loaded',
    });
    if (profileKick.current < 4) {
      return protectedRoutePlaceholder(location.pathname, true);
    }
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-sm font-semibold text-slate-700">{t('auth.profile_load_failed')}</p>
        <button
          type="button"
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-black"
          onClick={() => {
            profileKick.current = 0;
            void refreshProfile(session.user);
          }}
        >
          {t('common.try_again')}
        </button>
      </div>
    );
  }

  return <Outlet />;
}
