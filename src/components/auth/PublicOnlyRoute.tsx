import { Navigate, Outlet } from 'react-router-dom';
import { PageLoader } from '@/components/common/PageLoader';
import { useAuth } from '@/context/AuthContext';
import { authFlowLog, roleFromAuthMetadata, roleRoutingLog } from '@/lib/authDebug';
import { isFluxAdmin } from '@/utils/adminAccess';
import { ROUTES } from '@/utils/constants';
import { isOAuthRedirectPending } from '@/utils/authStorage';
import { isFluxHost } from '@/utils/fluxHost';
import { getPostLoginDestination } from '@/utils/fluxRedirect';
import { dashboardPathForRole, normalizeProfileRole } from '@/utils/userRole';

/** Keep authenticated users inside the app when browser back reaches public auth/landing routes. */
export function PublicOnlyRoute() {
  const { session, profile, authBootstrapped, authLoading, isConfigured } = useAuth();

  if (isConfigured && (!authBootstrapped || authLoading)) {
    return <PageLoader />;
  }

  if (isConfigured && session?.user && !isOAuthRedirectPending()) {
    if (profile) {
      const role = normalizeProfileRole(profile.role);
      const dest = isFluxHost()
        ? isFluxAdmin(session)
          ? getPostLoginDestination({ hostname: window.location.hostname, profileRole: role, session, returnTo: null })
          : ROUTES.fluxAccessDenied
        : dashboardPathForRole(role);
      roleRoutingLog('PublicOnlyRoute:redirect', {
        userId: session.user.id,
        email: session.user.email ?? profile.email ?? null,
        role_from_profile: profile.role,
        role_from_auth: roleFromAuthMetadata(session.user),
        redirect_destination: dest,
      });
      authFlowLog('PublicOnlyRoute redirect — user already authenticated', {
        userId: session.user.id,
        profileRole: role,
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
