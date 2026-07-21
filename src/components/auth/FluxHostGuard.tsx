import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { PageLoader } from '@/components/common/PageLoader';
import { useAuth } from '@/context/AuthContext';
import { isFluxAdmin } from '@/utils/adminAccess';
import { ROUTES } from '@/utils/constants';
import { isAdminRoute, isFluxHost } from '@/utils/fluxHost';
import { isAppShellPath } from '@/utils/navigation';

/** On flux.linkhelp.app, block public marketplace routes and client/helper workspaces. */
export function FluxHostGuard() {
  const location = useLocation();
  const { session, authBootstrapped, authLoading } = useAuth();

  if (!isFluxHost()) {
    return <Outlet />;
  }

  const path = location.pathname;

  const allowedPublic =
    path === ROUTES.adminLogin ||
    path === ROUTES.fluxAccessDenied ||
    path === ROUTES.authCallback ||
    path === ROUTES.resetPassword;

  if (allowedPublic || isAdminRoute(path)) {
    return <Outlet />;
  }

  if (!authBootstrapped || authLoading) {
    return <PageLoader />;
  }

  const authedAdmin = Boolean(session && isFluxAdmin(session));

  if (
    path === ROUTES.home ||
    path === ROUTES.login ||
    path === ROUTES.signup ||
    path === ROUTES.howItWorks ||
    path === ROUTES.contact
  ) {
    if (authedAdmin) return <Navigate to={ROUTES.adminDashboard} replace />;
    if (session && !authedAdmin) return <Navigate to={ROUTES.fluxAccessDenied} replace />;
    return <Navigate to={ROUTES.adminLogin} replace />;
  }

  if (isAppShellPath(path) || path === ROUTES.dashboard) {
    if (session && !authedAdmin) return <Navigate to={ROUTES.fluxAccessDenied} replace />;
    if (!session) return <Navigate to={ROUTES.adminLogin} replace />;
    if (authedAdmin) return <Navigate to={ROUTES.adminDashboard} replace />;
  }

  return <Outlet />;
}
