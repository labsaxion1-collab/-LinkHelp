import { NavLink, useLocation } from 'react-router-dom';
import { Home, MessageCircle, ClipboardList, MapPin, UserRound } from 'lucide-react';
import { ROUTES } from '@/utils/constants';
import { isAppShellPath } from '@/utils/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { clsx } from 'clsx';

type Item = { to: string; end?: boolean; labelKey: string; icon: typeof Home };

function navClass(active: boolean, isHome = false) {
  return clsx(
    'flex flex-col items-center justify-center touch-manipulation transition-all',
    isHome
      ? [
          '-mt-6 mx-auto h-[74px] w-[74px] rounded-[28px] border border-blue-100 bg-white shadow-[0_-4px_22px_rgba(37,99,235,0.18)]',
          active ? 'text-primary-600 ring-2 ring-primary-100' : 'text-gray-500 active:text-primary-600',
        ]
      : [
          'min-h-[54px] rounded-2xl px-1 py-2',
          active ? 'text-primary-600 bg-primary-50/90' : 'text-gray-500 hover:text-gray-800 active:bg-gray-100',
        ],
  );
}

export function MobileBottomNav() {
  const { pathname } = useLocation();
  const { t } = useLanguage();
  const { profile } = useAuth();

  if (!isAppShellPath(pathname)) return null;

  const useHelperNav = profile?.role === 'helper';

  const items: Item[] = useHelperNav
    ? [
        { to: ROUTES.messages, labelKey: 'mobile_nav.messages', icon: MessageCircle },
        { to: ROUTES.helperJobs, labelKey: 'mobile_nav.activities', icon: ClipboardList },
        { to: ROUTES.helperDashboard, end: true, labelKey: 'mobile_nav.home', icon: Home },
        { to: ROUTES.map, labelKey: 'mobile_nav.map', icon: MapPin },
        { to: ROUTES.settings, labelKey: 'mobile_nav.profile_menu', icon: UserRound },
      ]
    : [
        { to: ROUTES.messages, labelKey: 'mobile_nav.messages', icon: MessageCircle },
        { to: ROUTES.clientJobs, labelKey: 'mobile_nav.activities', icon: ClipboardList },
        { to: ROUTES.clientDashboard, end: true, labelKey: 'mobile_nav.home', icon: Home },
        { to: ROUTES.map, labelKey: 'mobile_nav.map', icon: MapPin },
        { to: ROUTES.settings, labelKey: 'mobile_nav.profile_menu', icon: UserRound },
      ];

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-gray-200/90 bg-white/95 backdrop-blur-md pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-[0_-8px_32px_rgba(15,23,42,0.08)]"
      aria-label={t('mobile_nav.aria')}
    >
      <ul className="flex justify-around items-stretch gap-0.5 px-1 max-w-lg mx-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const isHome = item.icon === Home;
          return (
            <li key={item.to} className="flex-1 min-w-0">
              <NavLink
                to={item.to}
                end={item.end}
                title={t(item.labelKey)}
                aria-label={t(item.labelKey)}
                className={({ isActive }) => navClass(isActive, isHome)}
              >
                <Icon className={clsx('shrink-0', isHome ? 'h-9 w-9' : 'h-7 w-7')} strokeWidth={2.25} aria-hidden />
                <span className="sr-only">{t(item.labelKey)}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
