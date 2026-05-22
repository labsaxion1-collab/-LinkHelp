import { NavLink, useLocation } from 'react-router-dom';
import { Home, MessageCircle, ClipboardList, MapPin, UserRound } from 'lucide-react';
import { ROUTES } from '@/utils/constants';
import { isAppShellPath, isHelperArea, pathImpliesAppMode } from '@/utils/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { useAppMode } from '@/context/AppModeContext';
import { clsx } from 'clsx';

type Item = { to: string; end?: boolean; labelKey: string; icon: typeof Home };

function navClass(active: boolean) {
  return clsx(
    'flex flex-col items-center justify-center py-2 px-1 rounded-xl min-h-[52px] touch-manipulation transition-colors',
    active ? 'text-primary-600 bg-primary-50/90' : 'text-gray-500 hover:text-gray-800 active:bg-gray-100',
  );
}

export function MobileBottomNav() {
  const { pathname } = useLocation();
  const { t } = useLanguage();
  const { mode } = useAppMode();

  if (!isAppShellPath(pathname)) return null;

  const implied = pathImpliesAppMode(pathname);
  const useHelperNav = isHelperArea(pathname) || (implied === null && mode === 'helper');

  const items: Item[] = useHelperNav
    ? [
        { to: ROUTES.helperOpportunities, end: true, labelKey: 'mobile_nav.home', icon: Home },
        { to: ROUTES.messages, labelKey: 'mobile_nav.messages', icon: MessageCircle },
        { to: ROUTES.helperJobs, labelKey: 'mobile_nav.activities', icon: ClipboardList },
        { to: ROUTES.map, labelKey: 'mobile_nav.map', icon: MapPin },
        { to: ROUTES.settings, labelKey: 'mobile_nav.profile_menu', icon: UserRound },
      ]
    : [
        { to: ROUTES.clientDashboard, end: true, labelKey: 'mobile_nav.home', icon: Home },
        { to: ROUTES.messages, labelKey: 'mobile_nav.messages', icon: MessageCircle },
        { to: ROUTES.clientJobs, labelKey: 'mobile_nav.activities', icon: ClipboardList },
        { to: ROUTES.map, labelKey: 'mobile_nav.map', icon: MapPin },
        { to: ROUTES.settings, labelKey: 'mobile_nav.profile_menu', icon: UserRound },
      ];

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-gray-200/90 bg-white/95 backdrop-blur-md pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1 shadow-[0_-4px_24px_rgba(15,23,42,0.06)]"
      aria-label={t('mobile_nav.aria')}
    >
      <ul className="flex justify-around items-stretch gap-0.5 px-1 max-w-lg mx-auto">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.to} className="flex-1 min-w-0">
              <NavLink
                to={item.to}
                end={item.end}
                title={t(item.labelKey)}
                aria-label={t(item.labelKey)}
                className={({ isActive }) => navClass(isActive)}
              >
                <Icon className="w-7 h-7 shrink-0" strokeWidth={2.2} aria-hidden />
                <span className="sr-only">{t(item.labelKey)}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
