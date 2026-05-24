import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import { PageLoader } from '@/components/common/PageLoader';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { PwaInstallPrompt } from '@/components/layout/PwaInstallPrompt';
import { PushNotificationPrompt } from '@/components/notifications/PushNotificationPrompt';
import { isAppShellPath, isClientArea, isHelperArea } from '@/utils/navigation';
import { clsx } from 'clsx';

export default function Layout() {
  const { pathname } = useLocation();
  const showMobileChrome = isAppShellPath(pathname);
  const shell = isHelperArea(pathname) ? 'helper' : isClientArea(pathname) ? 'client' : 'neutral';

  return (
    <div
      className={clsx(
        'min-h-dvh flex flex-col font-sans text-gray-900',
        shell === 'helper' && 'bg-slate-100',
        shell === 'client' && 'bg-[#f8fafc]',
        shell === 'neutral' && 'bg-gray-50',
      )}
    >
      <Navbar />
      <main
        className={clsx(
          'flex flex-1 flex-col min-h-0 w-full max-w-[100vw] overflow-x-hidden',
          showMobileChrome && 'pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:pb-0',
        )}
      >
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <div className={clsx(showMobileChrome && 'md:hidden')}>
        <PwaInstallPrompt />
        <PushNotificationPrompt />
        <MobileBottomNav />
      </div>
      <Footer />
    </div>
  );
}
