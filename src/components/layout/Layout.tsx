import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import { PageLoader } from '@/components/common/PageLoader';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { ScrollToTop } from '@/components/layout/ScrollToTop';
import { PwaInstallPrompt } from '@/components/layout/PwaInstallPrompt';
import { PushNotificationPrompt } from '@/components/notifications/PushNotificationPrompt';
import { isAppShellPath } from '@/utils/navigation';
import { isAdminPath } from '@/utils/adminAccess';
import { clsx } from 'clsx';
import { AppErrorBoundary } from '@/components/common/AppErrorBoundary';
import { useLanguage } from '@/context/LanguageContext';

export default function Layout() {
  const { pathname } = useLocation();
  const { t } = useLanguage();
  const isAdmin = isAdminPath(pathname);
  const showMobileChrome = !isAdmin && isAppShellPath(pathname);
  const isAppShell = !isAdmin && isAppShellPath(pathname);

  return (
    <div
      className={clsx(
        'relative min-h-dvh flex flex-col font-sans w-full max-w-full overflow-x-hidden',
        isAdmin ? 'bg-[#060912]' : isAppShell ? 'lh-app-bg text-[#0D1B2A]' : 'bg-[#050816] text-[#F2F4F7]',
      )}
    >
      {!isAdmin ? (
        <div className="relative z-50">
          <Navbar />
        </div>
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
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </AppErrorBoundary>
      </main>
      {!isAdmin ? (
        <div className={clsx('relative z-20', showMobileChrome && 'md:hidden')}>
          <PwaInstallPrompt />
          <PushNotificationPrompt />
          <MobileBottomNav />
        </div>
      ) : null}
      {!isAdmin && !isAppShell ? (
        <div className="relative z-10">
          <Footer />
        </div>
      ) : null}
    </div>
  );
}
