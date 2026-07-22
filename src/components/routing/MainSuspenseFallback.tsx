import { useLocation } from 'react-router-dom';
import { PageLoader } from '@/components/common/PageLoader';
import { AuthSessionBootstrapFallback } from '@/components/home/AuthSessionBootstrapFallback';
import { AppShellGenericSkeleton } from '@/components/home/AppShellGenericSkeleton';
import { useAuth } from '@/context/AuthContext';
import { isAuthenticatedHomeDashboardPath } from '@/utils/homeDashboardPaths';
import { isAppShellPath } from '@/utils/navigation';

/**
 * Layout Suspense fallback — home dashboards use PersistentHomeDashboardShell (fallback null).
 */
export function MainSuspenseFallback() {
  const { pathname } = useLocation();
  const { session, authBootstrapped, authLoading } = useAuth();

  if (isAuthenticatedHomeDashboardPath(pathname)) {
    return null;
  }

  if (!isAppShellPath(pathname)) {
    return <PageLoader />;
  }

  const hasSession = Boolean(session?.user);

  if (!authBootstrapped || (authLoading && !hasSession)) {
    return <AuthSessionBootstrapFallback />;
  }

  if (hasSession) {
    return <AppShellGenericSkeleton />;
  }

  return <AuthSessionBootstrapFallback />;
}
