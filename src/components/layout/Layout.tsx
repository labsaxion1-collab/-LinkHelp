import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import { MainSuspenseFallback } from '@/components/routing/MainSuspenseFallback';
import { PersistentHomeDashboardShell } from '@/components/home/HomeDashboardShellContext';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { MobileProfileMenu } from '@/components/layout/MobileProfileMenu';
import { MobileGuestDrawer } from '@/components/layout/MobileGuestDrawer';
import { MobileProfileMenuProvider, useMobileProfileMenu } from '@/context/MobileProfileMenuContext';
import { useAppMode } from '@/context/AppModeContext';
import { ScrollToTop } from '@/components/layout/ScrollToTop';
import { PwaInstallPrompt } from '@/components/layout/PwaInstallPrompt';
import { PushNotificationPrompt } from '@/components/notifications/PushNotificationPrompt';
import { isAppShellPath } from '@/utils/navigation';
import { isAdminPath } from '@/utils/adminAccess';
import { ROUTES } from '@/utils/constants';
import { clsx } from 'clsx';
import { AppErrorBoundary } from '@/components/common/AppErrorBoundary';
import { useLanguage } from '@/context/LanguageContext';
import { shouldShowLegacyPwaMigration } from '@/utils/legacyPwaMigration';
import { isWwwInstitutionalSurface } from '@/utils/marketingNav';
import { LegacyPwaMigrationPage } from '@/pages/public/LegacyPwaMigrationPage';
import { appPerfMark } from '@/utils/appPerf';

function LayoutMobileMenus() {
  const { pathname } = useLocation();
  const { open, anchorEl, closeMenu } = useMobileProfileMenu();
  const { isHelperMode } = useAppMode();
  const isConnected = isAppShellPath(pathname);
  const isWwwInstitutional = isWwwInstitutionalSurface(pathname);

  return (
    <>
      <MobileProfileMenu
        open={open && isConnected}
        onClose={closeMenu}
        anchorEl={anchorEl}
        isConnected={isConnected}
        isHelperNav={isHelperMode}
      />
      <MobileGuestDrawer open={open && !isConnected && !isWwwInstitutional} onClose={closeMenu} />
      <MobileGuestDrawer variant="www" open={open && isWwwInstitutional} onClose={closeMenu} />
    </>
  );
}

export default function Layout() {
  const { pathname } = useLocation();
  const { t } = useLanguage();

  if (shouldShowLegacyPwaMigration()) {
    return <LegacyPwaMigrationPage />;
  }

  const isAdmin =
    isAdminPath(pathname) ||
    pathname === ROUTES.adminLogin ||
    pathname === ROUTES.fluxAccessDenied;
  const showMobileChrome = !isAdmin && isAppShellPath(pathname);
  const isAppShell = !isAdmin && isAppShellPath(pathname);
  const isLanding = pathname === ROUTES.home && !isAppShell;

  useEffect(() => {
    appPerfMark('layout-outlet', pathname);
  }, [pathname]);

  return (
    <MobileProfileMenuProvider>
    <div
      className={clsx(
        'relative min-h-dvh flex flex-col font-sans w-full max-w-full',
        isAdmin ? 'bg-[#060912]' : isAppShell ? 'lh-app-bg text-[#0D1B2A]' : 'bg-[#050816] text-[#F2F4F7]',
      )}
    >
      {!isAdmin && !isLanding ? (
        <header
          className="sticky top-0 z-50 shrink-0"
          data-testid="app-authenticated-header"
        >
          <Navbar />
        </header>
      ) : null}
      <main
        className={clsx(
          'relative z-10 flex flex-1 flex-col min-h-0 w-full max-w-full overflow-x-hidden',
          showMobileChrome && 'pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-0',
        )}
      >
        <ScrollToTop />
        <AppErrorBoundary
          resetKey={`${pathname}`}
          title={t('route_error.title')}
          body={t('route_error.body')}
          reloadLabel={t('route_error.reload')}
        >
          <div className="relative flex min-h-0 flex-1 flex-col">
            <PersistentHomeDashboardShell />
            <div className="relative z-[2] flex min-h-0 flex-1 flex-col">
              <Suspense fallback={<MainSuspenseFallback />}>
                <Outlet />
              </Suspense>
            </div>
          </div>
        </AppErrorBoundary>
      </main>
      {!isAdmin ? (
        <div className={clsx('relative z-20', showMobileChrome && 'md:hidden')}>
          <PwaInstallPrompt />
          <PushNotificationPrompt />
          <MobileBottomNav />
        </div>
      ) : null}
      {!isAdmin && !isAppShell && !isLanding ? (
        <div className="relative z-10">
          <Footer />
        </div>
      ) : null}
      <LayoutMobileMenus />
    </div>
    </MobileProfileMenuProvider>
  );
}
