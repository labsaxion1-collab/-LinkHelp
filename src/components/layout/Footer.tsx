import { Link, useLocation } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { ROUTES } from '@/utils/constants';
import { useLanguage } from '@/context/LanguageContext';
import { useAppMode } from '@/context/AppModeContext';
import { isAppShellPath } from '@/utils/navigation';
import { clsx } from 'clsx';

export default function Footer() {
  const { t } = useLanguage();
  const { pathname } = useLocation();
  const { switchToClient, switchToHelper } = useAppMode();
  const year = new Date().getFullYear();
  const compactMobile = isAppShellPath(pathname);

  return (
    <footer
      className={clsx(
        'bg-white border-t border-gray-100 py-8 shrink-0',
        compactMobile && 'hidden md:block pb-[max(env(safe-area-inset-bottom),0.75rem)]',
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <Logo iconClassName="w-6 h-6" textClassName="text-sm font-bold" />
            <span className="text-gray-300 hidden md:block">|</span>
            <p className="text-xs text-gray-500 font-medium">{t('footer.copyright', { year })}</p>
          </div>

          <div className="flex flex-wrap justify-center gap-6">
            <button
              type="button"
              onClick={() => switchToClient()}
              className="text-xs font-semibold text-gray-500 hover:text-blue-600 transition-colors min-h-[44px] flex items-center px-1"
            >
              {t('footer.for_clients')}
            </button>
            <button
              type="button"
              onClick={() => switchToHelper()}
              className="text-xs font-semibold text-gray-500 hover:text-blue-600 transition-colors min-h-[44px] flex items-center px-1"
            >
              {t('footer.for_helpers')}
            </button>
            <Link
              to={ROUTES.home}
              className="text-xs font-semibold text-gray-500 hover:text-blue-600 transition-colors min-h-[44px] flex items-center px-1"
            >
              {t('footer.about')}
            </Link>
            <Link
              to={ROUTES.ideas}
              className="text-xs font-semibold text-gray-500 hover:text-blue-600 transition-colors min-h-[44px] flex items-center px-1"
            >
              {t('footer.support_ideas')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
