import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useAppMode } from '@/context/AppModeContext';
import { authFlowLog, roleFromAuthMetadata, roleRoutingLog } from '@/lib/authDebug';
import { dashboardPathForRole } from '@/utils/userRole';
import { ROUTES } from '@/utils/constants';
import type { ProfileRole } from '@/types/database';
import { PageLoader } from '@/components/common/PageLoader';
import { profileIsDeleted } from '@/utils/parseOAuthCallbackError';

type Props = {
  requiredRole: ProfileRole;
};

/** Redirects when profile role does not match the route workspace. */
export function RoleRoute({ requiredRole }: Props) {
  const { profile, session } = useAuth();
  const { profileRole } = useAppMode();
  const location = useLocation();

  if (!profile) return <PageLoader />;

  if (profileIsDeleted(profile)) {
    return <Navigate to={ROUTES.dashboard} replace />;
  }

  if (profileRole !== requiredRole) {
    const dest = dashboardPathForRole(profileRole);
    roleRoutingLog('RoleRoute:blocked', {
      userId: session?.user?.id ?? profile.id,
      email: session?.user?.email ?? profile.email ?? null,
      role_from_profile: profile.role,
      role_from_auth: roleFromAuthMetadata(session?.user),
      required_role: requiredRole,
      profile_role: profileRole,
      redirect_destination: dest,
      path: location.pathname,
    });
    authFlowLog('RoleRoute blocked — redirecting', {
      path: location.pathname,
      requiredRole,
      profileRole,
      redirectTo: dest,
      reason: 'profile_role_mismatch',
    });
    return <Navigate to={dest} replace />;
  }

  return <Outlet />;
}
