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
    'mx-auto flex w-full max-w-full flex-col items-center justify-center touch-manipulation transition-all',
    isHome
      ? [
          '-mt-3 h-14 w-14 rounded-[1.35rem] border shadow-[0_-4px_18px_rgba(21,101,255,0.4)]',
          active
            ? 'border-[#33B6FF]/50 bg-[#1565FF] text-white ring-2 ring-[#33B6FF]/30'
            : 'border-[#33B6FF]/20 bg-[#0D1B2A]/90 text-[#F2F4F7]/60 active:text-[#33B6FF]',
        ]
      : [
          'min-h-[48px] max-w-full rounded-xl px-0.5 py-1.5',
          active ? 'text-[#33B6FF] bg-[#1565FF]/12' : 'text-[#F2F4F7]/55 hover:text-[#F2F4F7] active:bg-white/5',
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
      className="lh-bottom-nav md:hidden fixed bottom-0 inset-x-0 z-40 w-full max-w-full pt-1.5 pb-[max(env(safe-area-inset-bottom),0.5rem)]"
      aria-label={t('mobile_nav.aria')}
    >
      <ul className="lh-bottom-nav-list">
        {items.map((item) => {
          const Icon = item.icon;
          const isHome = item.icon === Home;
          return (
            <li key={item.to} className={clsx(isHome ? 'lh-bottom-nav-home' : 'lh-bottom-nav-item')}>
              <NavLink
                to={item.to}
                end={item.end}
                title={t(item.labelKey)}
                aria-label={t(item.labelKey)}
                className={({ isActive }) => navClass(isActive, isHome)}
              >
                <Icon className={clsx('shrink-0', isHome ? 'h-7 w-7' : 'h-6 w-6')} strokeWidth={2.25} aria-hidden />
                <span className="sr-only">{t(item.labelKey)}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
