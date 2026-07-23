import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { PageLoader } from '@/components/common/PageLoader';
import { ExternalOriginRedirect } from '@/components/routing/ExternalOriginRedirect';
import { useAuth } from '@/context/AuthContext';
import { isFluxAdmin } from '@/utils/adminAccess';
import { buildExternalOriginUrl, resolveExternalHostRedirect } from '@/utils/hostRouting';
import { isFluxHost, isFluxHostAllowedPath } from '@/utils/fluxHost';
import { resolveFluxHostNavigation } from '@/utils/fluxRedirect';
import { getCurrentHostProfile } from '@/utils/linkhelpHosts';
import { isPasswordRecoveryPath } from '@/utils/passwordRecovery';
import { APP_ORIGIN } from '@/utils/linkhelpHosts';

/** On flux.linkhelp.app, block public marketplace routes and client/helper workspaces. */
export function FluxHostGuard() {
  const location = useLocation();
  const { session, authBootstrapped, authLoading } = useAuth();

  if (!isFluxHost()) {
    return <Outlet />;
  }

  const path = location.pathname;

  if (isFluxHost() && isPasswordRecoveryPath(path)) {
    return (
      <ExternalOriginRedirect
        targetUrl={buildExternalOriginUrl(APP_ORIGIN, path, location.search, location.hash)}
      />
    );
  }

  const profile = getCurrentHostProfile();
  const external = resolveExternalHostRedirect(profile, {
    pathname: path,
    search: location.search,
    hash: location.hash,
  });
  if (external) {
    return <ExternalOriginRedirect targetUrl={external} />;
  }

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
