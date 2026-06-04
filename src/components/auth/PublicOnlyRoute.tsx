import { Navigate, Outlet } from 'react-router-dom';
import { PageLoader } from '@/components/common/PageLoader';
import { useAuth } from '@/context/AuthContext';
import { useAppMode } from '@/context/AppModeContext';
import { authFlowLog } from '@/lib/authDebug';
import { ROUTES } from '@/utils/constants';
import { isOAuthRedirectPending } from '@/utils/authStorage';
import { dashboardPathForRole, normalizeProfileRole } from '@/utils/userRole';

/** Keep authenticated users inside the app when browser back reaches public auth/landing routes. */
export function PublicOnlyRoute() {
  const { session, profile, authBootstrapped, authLoading, isConfigured } = useAuth();
  const { mode } = useAppMode();

  if (isConfigured && (!authBootstrapped || authLoading)) {
    return <PageLoader />;
  }

  if (isConfigured && session?.user && !isOAuthRedirectPending()) {
    if (profile) {
      const role = normalizeProfileRole(profile.role);
      const dest = dashboardPathForRole(mode ?? role);
      authFlowLog('PublicOnlyRoute redirect — user already authenticated', {
        userId: session.user.id,
        profileRole: role,
        activeMode: mode,
        redirectTo: dest,
      });
      return <Navigate to={dest} replace />;
    }
    if (authBootstrapped && !authLoading) {
      authFlowLog('PublicOnlyRoute redirect — profile pending', {
        userId: session.user.id,
        redirectTo: ROUTES.dashboard,
      });
      return <Navigate to={ROUTES.dashboard} replace />;
    }
    return <PageLoader />;
  }

  return <Outlet />;
}
