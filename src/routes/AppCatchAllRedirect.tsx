import { Navigate } from 'react-router-dom';
import { PageLoader } from '@/components/common/PageLoader';
import { useAuth } from '@/context/AuthContext';
import { isFluxAdmin } from '@/utils/adminAccess';
import { ROUTES } from '@/utils/constants';
import { isFluxHost } from '@/utils/fluxHost';
import { resolveFluxHostNavigation } from '@/utils/fluxRedirect';

/** Unknown paths: marketplace → home; FLUX host → admin entry (never public landing). */
export function AppCatchAllRedirect() {
  const { session, authBootstrapped, authLoading } = useAuth();

  if (isFluxHost()) {
    if (!authBootstrapped || authLoading) {
      return <PageLoader />;
    }
    const authedAdmin = Boolean(session && isFluxAdmin(session));
    const target =
      resolveFluxHostNavigation({
        pathname: '/__catchall__',
        authedAdmin,
        hasSession: Boolean(session),
      }) ?? ROUTES.adminDashboard;
    return <Navigate to={target} replace />;
  }

  return <Navigate to={ROUTES.home} replace />;
}
