import { Navigate, Outlet } from 'react-router-dom';
import { PageLoader } from '@/components/common/PageLoader';
import { useAuth } from '@/context/AuthContext';
import { ROUTES } from '@/utils/constants';

/** Keep authenticated users inside the app when browser back reaches public auth/landing routes. */
export function PublicOnlyRoute() {
  const { session, authBootstrapped, authLoading, isConfigured } = useAuth();

  if (isConfigured && (!authBootstrapped || authLoading)) {
    return <PageLoader />;
  }

  if (isConfigured && session?.user) {
    return <Navigate to={ROUTES.dashboard} replace />;
  }

  return <Outlet />;
}
