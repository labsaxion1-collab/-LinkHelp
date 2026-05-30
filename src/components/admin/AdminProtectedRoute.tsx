import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { PageLoader } from '@/components/common/PageLoader';
import { ROUTES } from '@/utils/constants';
import { isFluxAdmin } from '@/utils/adminAccess';

/** Only Supabase admins (app_metadata.role) may access FLUX admin routes. */
export function AdminProtectedRoute() {
  const { session, authLoading, authBootstrapped } = useAuth();

  if (!authBootstrapped || authLoading) {
    return <PageLoader />;
  }

  if (!session) {
    return <Navigate to={ROUTES.login} replace />;
  }

  if (!isFluxAdmin(session)) {
    return <Navigate to={ROUTES.home} replace />;
  }

  return <Outlet />;
}
