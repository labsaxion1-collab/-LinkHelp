import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import { PageLoader } from '@/components/common/PageLoader';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { ScrollToTop } from '@/components/layout/ScrollToTop';
import { PwaInstallPrompt } from '@/components/layout/PwaInstallPrompt';
import { PushNotificationPrompt } from '@/components/notifications/PushNotificationPrompt';
import { isAppShellPath, isClientArea, isHelperArea } from '@/utils/navigation';
import { clsx } from 'clsx';
import appBackground from '../../../referencia/referencia-bg-linear-01.png';

export default function Layout() {
  const { pathname } = useLocation();
  const showMobileChrome = isAppShellPath(pathname);
  const shell = isHelperArea(pathname) ? 'helper' : isClientArea(pathname) ? 'client' : 'neutral';

  return (
    <div
      className={clsx(
        'relative min-h-dvh flex flex-col bg-[#050816] font-sans text-gray-900',
        shell === 'helper' && 'text-gray-900',
        shell === 'client' && 'text-gray-900',
        shell === 'neutral' && 'text-gray-900',
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none fixed -inset-4 z-0 bg-cover bg-center opacity-65 blur-[3px] scale-[1.03]"
        style={{ backgroundImage: `url(${appBackground})` }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(180deg,rgba(5,8,22,0.38)_0%,rgba(5,8,22,0.64)_100%)]"
      />
      <div className="relative z-50">
        <Navbar />
      </div>
      <main
        className={clsx(
          'relative z-10 flex flex-1 flex-col min-h-0 w-full max-w-[100vw] overflow-x-hidden',
          showMobileChrome && 'pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:pb-0',
        )}
      >
        <ScrollToTop />
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <div className={clsx('relative z-20', showMobileChrome && 'md:hidden')}>
        <PwaInstallPrompt />
        <PushNotificationPrompt />
        <MobileBottomNav />
      </div>
      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}
