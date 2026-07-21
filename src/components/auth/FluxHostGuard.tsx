import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { PageLoader } from '@/components/common/PageLoader';
import { useAuth } from '@/context/AuthContext';
import { isFluxAdmin } from '@/utils/adminAccess';
import { isFluxHost, isFluxHostAllowedPath } from '@/utils/fluxHost';
import { resolveFluxHostNavigation } from '@/utils/fluxRedirect';

/** On flux.linkhelp.app, block public marketplace routes and client/helper workspaces. */
export function FluxHostGuard() {
  const location = useLocation();
  const { session, authBootstrapped, authLoading } = useAuth();

  if (!isFluxHost()) {
    return <Outlet />;
  }

  const path = location.pathname;

  if (isFluxHostAllowedPath(path)) {
    return <Outlet />;
  }

  if (!authBootstrapped || authLoading) {
    return <PageLoader />;
  }

  const authedAdmin = Boolean(session && isFluxAdmin(session));
  const target = resolveFluxHostNavigation({
    pathname: path,
    authedAdmin,
    hasSession: Boolean(session),
  });

  if (target) {
    return <Navigate to={target} replace />;
  }

  return <Outlet />;
}
