import { lazy, Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import { PageLoader } from '@/components/common/PageLoader';
import { AuthSessionBootstrapFallback } from '@/components/home/AuthSessionBootstrapFallback';
import { useAuth } from '@/context/AuthContext';
import { authFlowLog, roleFromAuthMetadata, roleRoutingLog } from '@/lib/authDebug';
import { isFluxAdmin } from '@/utils/adminAccess';
import { ROUTES } from '@/utils/constants';
import { getPostLoginDestination } from '@/utils/fluxRedirect';
import { getCurrentHostProfile } from '@/utils/linkhelpHosts';
import { importWithRetry } from '@/utils/lazyWithRetry';
import { normalizeProfileRole } from '@/utils/userRole';

const LandingPage = lazy(() => importWithRetry(() => import('@/pages/LandingPage')));

/** `/` — landing on www/combined; app host → login or role dashboards. */
export function HostHomeEntry() {
  const profile = getCurrentHostProfile();

  if (profile === 'app') {
    return <AppHostHomeRedirect />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <LandingPage />
    </Suspense>
  );
}

function AppHostHomeRedirect() {
  const { session, profile, authBootstrapped, authLoading, isConfigured } = useAuth();

  if (isConfigured && (!authBootstrapped || authLoading)) {
    return <AuthSessionBootstrapFallback />;
  }

  if (!session?.user) {
    return <Navigate to={ROUTES.login} replace />;
  }

  if (isFluxAdmin(session)) {
    return <Navigate to={ROUTES.adminDashboard} replace />;
  }

  if (!profile) {
    if (authBootstrapped && !authLoading) {
      return <Navigate to={ROUTES.dashboard} replace />;
    }
    return <AuthSessionBootstrapFallback />;
  }

  const role = normalizeProfileRole(profile.role);
  const dest = getPostLoginDestination({
    hostname: typeof window !== 'undefined' ? window.location.hostname : undefined,
    profileRole: role,
    session,
    returnTo: null,
  });

  roleRoutingLog('AppHostHomeRedirect', {
    userId: session.user.id,
    email: session.user.email ?? profile.email ?? null,
    role_from_profile: profile.role,
    role_from_auth: roleFromAuthMetadata(session.user),
    redirect_destination: dest,
  });
  authFlowLog('App host / redirect', { dest, role });

  return <Navigate to={dest} replace />;
}
