import { Outlet, useLocation } from 'react-router-dom';
import { ExternalOriginRedirect } from '@/components/routing/ExternalOriginRedirect';
import { resolveExternalHostRedirect } from '@/utils/hostRouting';
import { getCurrentHostProfile } from '@/utils/linkhelpHosts';

/** On app.linkhelp.app, block www-only pages and FLUX admin (external redirect). */
export function AppHostGuard() {
  const location = useLocation();
  const profile = getCurrentHostProfile();

  const external = resolveExternalHostRedirect(profile, {
    pathname: location.pathname,
    search: location.search,
    hash: location.hash,
  });

  if (external) {
    return <ExternalOriginRedirect targetUrl={external} />;
  }

  return <Outlet />;
}
