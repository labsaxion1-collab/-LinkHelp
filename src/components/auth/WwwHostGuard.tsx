import { Outlet, useLocation } from 'react-router-dom';
import { ExternalOriginRedirect } from '@/components/routing/ExternalOriginRedirect';
import { resolveExternalHostRedirect } from '@/utils/hostRouting';
import { getCurrentHostProfile } from '@/utils/linkhelpHosts';

/** On www.linkhelp.app, only institutional routes render; marketplace → app origin. */
export function WwwHostGuard() {
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
