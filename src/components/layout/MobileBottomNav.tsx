import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  ClipboardList,
  MessageCircle,
  Images,
  UserRound,
  MapPin,
  ArrowLeftRight,
  Loader2,
} from 'lucide-react';
import { ROUTES } from '@/utils/constants';
import { isAppShellPath, isHelperArea, pathImpliesAppMode } from '@/utils/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { useAppMode } from '@/context/AppModeContext';
import { useAuth } from '@/context/AuthContext';
import { useModeSwitch } from '@/hooks/useModeSwitch';
import { useSessionViewer } from '@/hooks/useSessionViewer';
import { HelperTermsGateModal } from '@/components/auth/HelperTermsGateModal';
import { clsx } from 'clsx';

type Item =
  | { kind: 'link'; to: string; end?: boolean; labelKey: string; icon: typeof Home }
  | { kind: 'portfolio'; labelKey: string; icon: typeof Images }
  | { kind: 'mode_switch' };

function navClass(active: boolean) {
  return clsx(
    'flex flex-col items-center justify-center py-2 px-1 rounded-2xl min-h-[52px] touch-manipulation transition-colors',
    active ? 'text-primary-600 bg-primary-50/90' : 'text-gray-500 hover:text-gray-800 active:bg-gray-100',
  );
}

function homeNavClass(active: boolean) {
  return clsx(
    'relative -mt-4 flex flex-col items-center justify-center rounded-3xl min-h-[66px] min-w-[66px] touch-manipulation transition-all shadow-lg',
    active
      ? 'bg-gradient-to-br from-primary-500 to-blue-700 text-white shadow-blue-500/25'
      : 'bg-white text-primary-600 ring-1 ring-blue-100',
  );
}

export function MobileBottomNav() {
  const { pathname, hash } = useLocation();
  const { t } = useLanguage();
  const { mode } = useAppMode();
  const { profile, updateProfile } = useAuth();
  const me = useSessionViewer();
  const { toClient, toHelper, modeSwitchBusy } = useModeSwitch();
  const [helperTermsOpen, setHelperTermsOpen] = useState(false);
  const [helperTermsSaving, setHelperTermsSaving] = useState(false);

  if (!isAppShellPath(pathname)) return null;

  const implied = pathImpliesAppMode(pathname);
  const useHelperNav = isHelperArea(pathname) || (implied === null && mode === 'helper');

  const portfolioPath = pathname.startsWith('/helper') ? pathname : ROUTES.helperOpportunities;
  const portfolioActive = isHelperArea(pathname) && hash === '#portfolio';

  const helperTermsStorageKey = me.id ? `linkhelp:helper-terms:${me.id}` : '';
  const switchLabelKey =
    mode === 'client' ? 'mobile_nav.switch_to_helper' : 'mobile_nav.switch_to_client';

  const goHelperOrPrompt = () => {
    if (modeSwitchBusy) return;
    const acceptedLocally =
      helperTermsStorageKey && typeof window !== 'undefined'
        ? window.localStorage.getItem(helperTermsStorageKey) === 'true'
        : false;
    if (profile && profile.helper_terms_accepted !== true && !acceptedLocally) {
      setHelperTermsOpen(true);
      return;
    }
    void toHelper();
  };

  const handleModeSwitch = () => {
    if (modeSwitchBusy) return;
    if (mode === 'helper') {
      void toClient();
    } else {
      goHelperOrPrompt();
    }
  };

  const confirmHelperTerms = async () => {
    setHelperTermsSaving(true);
    const err = await updateProfile({
      helper_terms_accepted: true,
      helper_terms_accepted_at: new Date().toISOString(),
    });
    setHelperTermsSaving(false);
    if (err && import.meta.env.DEV && err.devRaw) {
      console.info('[LinkHelp] updateProfile raw:', err.devRaw);
    }
    if (helperTermsStorageKey && typeof window !== 'undefined') {
      window.localStorage.setItem(helperTermsStorageKey, 'true');
    }
    setHelperTermsOpen(false);
    void toHelper({ skipHelperPrep: true });
  };

  const modeSwitchItem: Item = { kind: 'mode_switch' };

  const items: Item[] = useHelperNav
    ? [
        modeSwitchItem,
        { kind: 'link', to: ROUTES.messages, labelKey: 'mobile_nav.messages', icon: MessageCircle },
        { kind: 'link', to: ROUTES.helperOpportunities, end: true, labelKey: 'mobile_nav.home', icon: Home },
        { kind: 'link', to: ROUTES.map, labelKey: 'mobile_nav.nearby', icon: MapPin },
        { kind: 'link', to: ROUTES.settings, labelKey: 'mobile_nav.profile', icon: UserRound },
      ]
    : [
        modeSwitchItem,
        { kind: 'link', to: ROUTES.messages, labelKey: 'mobile_nav.messages', icon: MessageCircle },
        { kind: 'link', to: ROUTES.clientDashboard, end: true, labelKey: 'mobile_nav.home', icon: Home },
        { kind: 'link', to: ROUTES.clientJobs, labelKey: 'mobile_nav.requests', icon: ClipboardList },
        { kind: 'link', to: ROUTES.settings, labelKey: 'mobile_nav.profile', icon: UserRound },
      ];

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-gray-200/90 bg-white/95 backdrop-blur-md pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1 shadow-[0_-4px_24px_rgba(15,23,42,0.06)]"
        aria-label={t('mobile_nav.aria')}
      >
        <ul className="flex justify-around items-stretch gap-0.5 px-1 max-w-lg mx-auto">
          {items.map((item, index) => {
            if (item.kind === 'mode_switch') {
              const label = t(switchLabelKey);
              return (
                <li key="mode-switch" className="flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={handleModeSwitch}
                    disabled={modeSwitchBusy}
                    title={t('mobile_nav.switch_mode')}
                    aria-label={t('mobile_nav.switch_mode', { target: label })}
                    className={clsx(
                      navClass(false),
                      'w-full text-primary-600 transition-opacity duration-200',
                      modeSwitchBusy && 'opacity-60 pointer-events-none',
                    )}
                  >
                    {modeSwitchBusy ? (
                      <Loader2 className="w-7 h-7 shrink-0 animate-spin" strokeWidth={2.2} aria-hidden />
                    ) : (
                      <ArrowLeftRight className="w-7 h-7 shrink-0" strokeWidth={2.2} aria-hidden />
                    )}
                    <span className="sr-only">{label}</span>
                  </button>
                </li>
              );
            }

            if (item.kind === 'portfolio') {
              const Icon = item.icon;
              return (
                <li key="portfolio" className="flex-1 min-w-0">
                  <NavLink
                    to={{ pathname: portfolioPath, hash: 'portfolio' }}
                    className={navClass(portfolioActive)}
                    title={t(item.labelKey)}
                    aria-label={t(item.labelKey)}
                  >
                    <Icon className="w-7 h-7 shrink-0" strokeWidth={2.2} aria-hidden />
                    <span className="sr-only">{t(item.labelKey)}</span>
                  </NavLink>
                </li>
              );
            }

            const Icon = item.icon;
            const isHome = item.to === ROUTES.clientDashboard || item.to === ROUTES.helperOpportunities;
            return (
              <li key={item.to ?? `item-${index}`} className="flex-1 min-w-0">
                <NavLink
                  to={item.to}
                  end={item.end}
                  title={t(item.labelKey)}
                  aria-label={t(item.labelKey)}
                  className={({ isActive }) => (isHome ? homeNavClass(isActive) : navClass(isActive))}
                >
                  <Icon className={isHome ? 'w-9 h-9 shrink-0' : 'w-7 h-7 shrink-0'} strokeWidth={2.2} aria-hidden />
                  <span className="sr-only">{t(item.labelKey)}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <HelperTermsGateModal
        open={helperTermsOpen}
        onClose={() => setHelperTermsOpen(false)}
        onConfirm={() => void confirmHelperTerms()}
        loading={helperTermsSaving}
      />
    </>
  );
}
