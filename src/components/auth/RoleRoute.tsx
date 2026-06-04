import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useAppMode } from '@/context/AppModeContext';
import { authFlowLog } from '@/lib/authDebug';
import { dashboardPathForRole } from '@/utils/userRole';
import type { ProfileRole } from '@/types/database';
import { PageLoader } from '@/components/common/PageLoader';

type Props = {
  requiredRole: ProfileRole;
};

/** Redirects when the active workspace mode does not match the route. */
export function RoleRoute({ requiredRole }: Props) {
  const { profile } = useAuth();
  const { mode, profileRole } = useAppMode();
  const location = useLocation();

  if (!profile) return <PageLoader />;

  if (mode !== requiredRole) {
    const dest = dashboardPathForRole(mode);
    authFlowLog('RoleRoute blocked — redirecting', {
      path: location.pathname,
      requiredRole,
      activeMode: mode,
      profileRole,
      redirectTo: dest,
      reason: 'active_mode_mismatch',
    });
    return <Navigate to={dest} replace />;
  }

  return <Outlet />;
}
