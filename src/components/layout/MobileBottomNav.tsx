import { NavLink, useLocation } from 'react-router-dom';
import { Home, ClipboardList, MessageCircle, Images, LayoutDashboard, UserRound, MapPin } from 'lucide-react';
import { ROUTES } from '@/utils/constants';
import { isAppShellPath, isHelperArea, pathImpliesAppMode } from '@/utils/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { useAppMode } from '@/context/AppModeContext';
import { clsx } from 'clsx';

type Item =
  | { kind: 'link'; to: string; end?: boolean; labelKey: string; icon: typeof Home }
  | { kind: 'portfolio'; labelKey: string; icon: typeof Images };

function navClass(active: boolean) {
  return clsx(
    'flex flex-col items-center justify-center gap-0.5 py-2 px-1 rounded-xl min-h-[52px] touch-manipulation transition-colors',
    active ? 'text-primary-600 bg-primary-50/90' : 'text-gray-500 hover:text-gray-800 active:bg-gray-100',
  );
}

export function MobileBottomNav() {
  const { pathname, hash } = useLocation();
  const { t } = useLanguage();
  const { mode } = useAppMode();

  if (!isAppShellPath(pathname)) return null;

  const implied = pathImpliesAppMode(pathname);
  const useHelperNav = isHelperArea(pathname) || (implied === null && mode === 'helper');

  const portfolioPath = pathname.startsWith('/helper') ? pathname : ROUTES.helperOpportunities;
  const portfolioActive = isHelperArea(pathname) && hash === '#portfolio';

  const items: Item[] = useHelperNav
    ? [
        { kind: 'link', to: ROUTES.helperOpportunities, end: true, labelKey: 'mobile_nav.home', icon: Home },
        { kind: 'link', to: ROUTES.helperDashboard, labelKey: 'mobile_nav.dashboard', icon: LayoutDashboard },
        { kind: 'portfolio', labelKey: 'mobile_nav.portfolio', icon: Images },
        { kind: 'link', to: ROUTES.helperJobs, labelKey: 'mobile_nav.jobs', icon: ClipboardList },
        { kind: 'link', to: ROUTES.messages, labelKey: 'mobile_nav.messages', icon: MessageCircle },
        { kind: 'link', to: ROUTES.settings, labelKey: 'mobile_nav.profile', icon: UserRound },
      ]
    : [
        { kind: 'link', to: ROUTES.clientDashboard, end: true, labelKey: 'mobile_nav.home', icon: Home },
        { kind: 'link', to: ROUTES.clientJobs, labelKey: 'mobile_nav.requests', icon: ClipboardList },
        { kind: 'link', to: ROUTES.map, labelKey: 'mobile_nav.nearby', icon: MapPin },
        { kind: 'link', to: ROUTES.messages, labelKey: 'mobile_nav.messages', icon: MessageCircle },
        { kind: 'link', to: ROUTES.payments, labelKey: 'mobile_nav.credits', icon: LayoutDashboard },
        { kind: 'link', to: ROUTES.settings, labelKey: 'mobile_nav.profile', icon: UserRound },
      ];

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-gray-200/90 bg-white/95 backdrop-blur-md pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1 shadow-[0_-4px_24px_rgba(15,23,42,0.06)]"
      aria-label={t('mobile_nav.aria')}
    >
      <ul className="flex justify-around items-stretch gap-0.5 px-1 max-w-lg mx-auto">
        {items.map((item) => {
          if (item.kind === 'portfolio') {
            const Icon = item.icon;
            return (
              <li key="portfolio" className="flex-1 min-w-0">
                <NavLink
                  to={{ pathname: portfolioPath, hash: 'portfolio' }}
                  className={navClass(portfolioActive)}
                >
                  <Icon className="w-[22px] h-[22px] shrink-0" strokeWidth={2.25} aria-hidden />
                  <span className="text-[10px] font-bold leading-tight text-center truncate w-full">{t(item.labelKey)}</span>
                </NavLink>
              </li>
            );
          }
          const Icon = item.icon;
          return (
            <li key={item.to} className="flex-1 min-w-0">
              <NavLink to={item.to} end={item.end} className={({ isActive }) => navClass(isActive)}>
                <Icon className="w-[22px] h-[22px] shrink-0" strokeWidth={2.25} aria-hidden />
                <span className="text-[10px] font-bold leading-tight text-center truncate w-full">{t(item.labelKey)}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
