import { Link, useLocation } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { ByFluxBadge } from '@/components/brand/ByFluxBadge';
import { UI_VISIBILITY } from '@/config/uiVisibility';
import { ROUTES } from '@/utils/constants';
import { useLanguage } from '@/context/LanguageContext';
import { isAppShellPath } from '@/utils/navigation';
import { isAppHost } from '@/utils/linkhelpHosts';
import { MarketingNavLink } from '@/components/routing/MarketingNavLink';
import { clsx } from 'clsx';

export default function Footer() {
  const { t } = useLanguage();
  const { pathname } = useLocation();
  const year = new Date().getFullYear();
  const compactMobile = isAppShellPath(pathname);
  const isHome = pathname === ROUTES.home;

  return (
    <footer
      className={clsx(
        'border-t py-8 shrink-0',
        isHome ? 'bg-[#050816] border-white/10' : 'bg-white border-gray-100',
        compactMobile && 'hidden md:block pb-[max(env(safe-area-inset-bottom),0.75rem)]',
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col items-center gap-2 md:flex-row md:items-center md:gap-3">
            <Logo iconClassName="h-12 w-12" textClassName="text-sm font-bold" tone={isHome ? 'light' : 'dark'} />
            <ByFluxBadge className={isHome ? 'text-cyan-200/50' : 'text-slate-400'} />
            <span className={clsx('hidden md:block', isHome ? 'text-white/20' : 'text-gray-300')}>|</span>
            <p className={clsx('text-xs font-medium', isHome ? 'text-[#C7D2FE]/65' : 'text-gray-500')}>{t('footer.copyright', { year })}</p>
          </div>

          <div className="flex flex-wrap justify-center gap-6">
            <MarketingNavLink
              to={`${ROUTES.signup}?role=client`}
              className={clsx('text-xs font-semibold transition-colors min-h-[44px] flex items-center px-1', isHome ? 'text-[#C7D2FE]/70 hover:text-white' : 'text-gray-500 hover:text-blue-600')}
            >
              {t('footer.for_clients')}
            </MarketingNavLink>
            <MarketingNavLink
              to={`${ROUTES.signup}?role=helper`}
              className={clsx('text-xs font-semibold transition-colors min-h-[44px] flex items-center px-1', isHome ? 'text-[#C7D2FE]/70 hover:text-white' : 'text-gray-500 hover:text-blue-600')}
            >
              {t('footer.for_helpers')}
            </MarketingNavLink>
            <Link
              to={ROUTES.home}
              className={clsx('text-xs font-semibold transition-colors min-h-[44px] flex items-center px-1', isHome ? 'text-[#C7D2FE]/70 hover:text-white' : 'text-gray-500 hover:text-blue-600')}
            >
              {t('footer.about')}
            </Link>
            {isAppHost() ? (
              <MarketingNavLink
                to={ROUTES.howItWorks}
                className={clsx('text-xs font-semibold transition-colors min-h-[44px] flex items-center px-1', isHome ? 'text-[#C7D2FE]/70 hover:text-white' : 'text-gray-500 hover:text-blue-600')}
              >
                {t('footer.how_it_works')}
              </MarketingNavLink>
            ) : (
              <Link
                to={ROUTES.howItWorks}
                className={clsx('text-xs font-semibold transition-colors min-h-[44px] flex items-center px-1', isHome ? 'text-[#C7D2FE]/70 hover:text-white' : 'text-gray-500 hover:text-blue-600')}
              >
                {t('footer.how_it_works')}
              </Link>
            )}
            <Link
              to={ROUTES.contact}
              className={clsx('text-xs font-semibold transition-colors min-h-[44px] flex items-center px-1', isHome ? 'text-[#C7D2FE]/70 hover:text-white' : 'text-gray-500 hover:text-blue-600')}
            >
              Contato
            </Link>
            {UI_VISIBILITY.ideas ? (
              <MarketingNavLink
                to={ROUTES.ideas}
                className={clsx('text-xs font-semibold transition-colors min-h-[44px] flex items-center px-1', isHome ? 'text-[#C7D2FE]/70 hover:text-white' : 'text-gray-500 hover:text-blue-600')}
              >
                {t('footer.support_ideas')}
              </MarketingNavLink>
            ) : null}
          </div>
        </div>
      </div>
    </footer>
  );
}
