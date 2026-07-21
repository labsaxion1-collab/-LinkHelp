import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { PageLoader } from '@/components/common/PageLoader';
import { ROUTES } from '@/utils/constants';
import { isFluxAdmin } from '@/utils/adminAccess';
import { isFluxHost } from '@/utils/fluxHost';
import { getAuthLoginPathForRoute, sanitizeReturnTo } from '@/utils/fluxRedirect';

/** Only Supabase admins (app_metadata.role) may access FLUX admin routes. */
export function AdminProtectedRoute() {
  const { session, authLoading, authBootstrapped } = useAuth();
  const location = useLocation();

  if (!authBootstrapped || authLoading) {
    return <PageLoader />;
  }

  if (!session) {
    const returnPath = sanitizeReturnTo(`${location.pathname}${location.search}`) ?? location.pathname;
    const loginTarget = getAuthLoginPathForRoute(location.pathname, returnPath);
    return <Navigate to={loginTarget} replace state={{ from: returnPath }} />;
  }

  if (!isFluxAdmin(session)) {
    if (isFluxHost()) {
      return <Navigate to={ROUTES.fluxAccessDenied} replace />;
    }
    return <Navigate to={ROUTES.home} replace />;
  }

  return <Outlet />;
}
