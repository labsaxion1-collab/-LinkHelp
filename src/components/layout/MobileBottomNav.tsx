import { NavLink, useLocation } from 'react-router-dom';
import { Home, MessageCircle, ClipboardList, MapPin, UserRound, Plus } from 'lucide-react';
import { ROUTES } from '@/utils/constants';
import { isAppShellPath } from '@/utils/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { useAppMode } from '@/context/AppModeContext';
import { clsx } from 'clsx';

type Item = { to: string; end?: boolean; labelKey: string; icon: typeof Home; state?: Record<string, boolean>; primary?: boolean };

function navClass(active: boolean, isHome = false) {
  return clsx(
    'mx-auto flex w-full max-w-full flex-col items-center justify-center gap-0.5 touch-manipulation transition-all duration-200',
    isHome
      ? [
          '-mt-4 h-[3.75rem] w-[3.75rem] rounded-[1.4rem] border transition-all duration-200 active:scale-95',
          active
            ? 'border-[#2563FF]/25 bg-[#2563FF] text-white shadow-[0_12px_32px_rgba(37,99,255,0.32),inset_0_1px_0_rgba(255,255,255,0.2)]'
            : 'border-[#E8ECF4] bg-white text-[#6B7280] shadow-[0_4px_20px_rgba(15,23,42,0.07)] active:text-[#2563FF]',
        ]
      : [
          'min-h-[52px] max-w-full rounded-2xl px-0.5 py-1 transition-all duration-200 active:scale-95',
          active
            ? 'text-[#2563FF]'
            : 'text-[#94A3B8] hover:text-[#2563FF] active:bg-[#F0F4FF]',
        ],
  );
}

export function MobileBottomNav() {
  const { pathname } = useLocation();
  const { t } = useLanguage();
  const { isHelperMode } = useAppMode();

  if (!isAppShellPath(pathname)) return null;

  const useHelperNav = isHelperMode;

  const items: Item[] = useHelperNav
    ? [
        { to: ROUTES.messages, labelKey: 'mobile_nav.messages', icon: MessageCircle },
        { to: ROUTES.helperJobs, labelKey: 'mobile_nav.activities', icon: ClipboardList },
        { to: ROUTES.helperDashboard, end: true, labelKey: 'mobile_nav.home', icon: Home },
        { to: ROUTES.map, labelKey: 'mobile_nav.map', icon: MapPin },
        { to: ROUTES.profile, labelKey: 'mobile_nav.profile_menu', icon: UserRound },
      ]
    : [
        { to: ROUTES.messages, labelKey: 'mobile_nav.messages', icon: MessageCircle },
        { to: ROUTES.clientJobs, labelKey: 'mobile_nav.activities', icon: ClipboardList },
        { to: ROUTES.clientDashboard, end: true, labelKey: 'client_dashboard.create_order_now', icon: Plus, state: { openCreate: true }, primary: true },
        { to: ROUTES.map, labelKey: 'mobile_nav.map', icon: MapPin },
        { to: ROUTES.profile, labelKey: 'mobile_nav.profile_menu', icon: UserRound },
      ];

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 w-full max-w-full"
      style={{
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(15,23,42,0.06)',
        boxShadow: '0 -8px 32px rgba(15,23,42,0.06)',
        paddingTop: '0.375rem',
        paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)',
      }}
      aria-label={t('mobile_nav.aria')}
    >
      <ul className="lh-bottom-nav-list">
        {items.map((item) => {
          const Icon = item.icon;
          const isHome = item.primary === true || item.icon === Home;
          const label = t(item.labelKey);
          return (
            <li key={item.to} className={clsx(isHome ? 'lh-bottom-nav-home' : 'lh-bottom-nav-item')}>
              <NavLink
                to={item.to}
                state={item.state}
                end={item.end}
                title={label}
                aria-label={label}
                className={({ isActive }) => navClass(isActive, isHome)}
              >
                {({ isActive }) => (
                  <>
                    {/* Active top indicator (non-home) */}
                    {!isHome && (
                      <span
                        className={clsx(
                          'mb-0.5 h-[3px] w-5 rounded-full transition-all duration-300',
                          isActive ? 'bg-[#2563FF] opacity-100' : 'opacity-0',
                        )}
                        aria-hidden
                      />
                    )}
                    <Icon
                      className={clsx('shrink-0 transition-transform duration-200', isHome ? 'h-7 w-7' : 'h-[22px] w-[22px]', isActive && !isHome && 'scale-110')}
                      strokeWidth={isActive ? 2.5 : 2}
                      aria-hidden
                    />
                    {!isHome && (
                      <span
                        className={clsx(
                          'max-w-[64px] truncate text-center text-[9.5px] font-bold leading-none transition-all duration-200',
                          isActive ? 'text-[#2563FF]' : 'text-[#94A3B8]',
                        )}
                      >
                        {label}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
