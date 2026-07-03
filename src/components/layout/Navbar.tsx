import { useLocation, useNavigate } from 'react-router-dom';
import { Activity, Briefcase, Globe, ChevronDown, Home, MessageCircle, User, LogOut, Package, Settings, GraduationCap } from 'lucide-react';
import { redirectToLoginAfterSignOut } from '@/utils/authRedirect';
import { useEffect, useRef, useState, useCallback, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@/context/LanguageContext';
import { useSessionViewer } from '@/hooks/useSessionViewer';
import { useAppMode } from '@/context/AppModeContext';
import { useAuth } from '@/context/AuthContext';
import { ROUTES } from '@/utils/constants';
import { useToast } from '@/context/ToastContext';
import { isAppShellPath } from '@/utils/navigation';
import { NotificationsDropdown } from './NotificationsDropdown';
import { useMobileProfileMenu } from '@/context/MobileProfileMenuContext';
import { useTutorial } from '@/context/TutorialContext';
import { clsx } from 'clsx';
import { APP_UI_LANGUAGES } from '@/data/spokenLanguages';

export default function Navbar() {
  const { open: mobileProfileOpen, toggleMenu: toggleMobileProfileMenu, closeMenu: closeMobileProfileMenu } =
    useMobileProfileMenu();
  const { openTutorial } = useTutorial();
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const langButtonRef = useRef<HTMLButtonElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  const langPanelRef = useRef<HTMLDivElement>(null);
  const profilePanelRef = useRef<HTMLDivElement>(null);
  const navControlsRef = useRef<HTMLDivElement>(null);
  const [langPanelStyle, setLangPanelStyle] = useState<CSSProperties>({});
  const [profilePanelStyle, setProfilePanelStyle] = useState<CSSProperties>({});

  const isConnected = isAppShellPath(location.pathname);
  const me = useSessionViewer();
  const userAvatar = me.avatar;
  const userId = me.id;
  const { signOut, isConfigured, session, profile, updateProfile } = useAuth();
  const { isHelperMode } = useAppMode();

  const isHelperNav = isHelperMode;
  const isHome = location.pathname === ROUTES.home;
  const usePremiumNav =
    isHome ||
    location.pathname === ROUTES.login ||
    location.pathname === ROUTES.signup ||
    location.pathname === ROUTES.howItWorks ||
    location.pathname === ROUTES.contact ||
    isConnected;
  const logoTarget = isConnected
    ? isHelperNav
      ? ROUTES.helperOpportunities
      : ROUTES.clientDashboard
    : ROUTES.home;

  useEffect(() => {
    setIsLangMenuOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  const isNavSurfaceTarget = useCallback((target: Node) => {
    const refs = [navControlsRef, langButtonRef, profileButtonRef, langPanelRef, profilePanelRef];
    return refs.some((ref) => ref.current?.contains(target));
  }, []);

  const updateLangPanelPosition = useCallback(() => {
    const rect = langButtonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const panelWidth = 128;
    setLangPanelStyle({
      position: 'fixed',
      top: rect.bottom + 8,
      left: Math.min(rect.right - panelWidth, window.innerWidth - panelWidth - 8),
      width: panelWidth,
      zIndex: 120,
    });
  }, []);

  const updateProfilePanelPosition = useCallback(() => {
    const rect = profileButtonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const panelWidth = 224;
    setProfilePanelStyle({
      position: 'fixed',
      top: rect.bottom + 8,
      left: Math.min(rect.right - panelWidth, window.innerWidth - panelWidth - 8),
      width: panelWidth,
      zIndex: 120,
    });
  }, []);

  useEffect(() => {
    if (!isLangMenuOpen) return;
    updateLangPanelPosition();
    window.addEventListener('resize', updateLangPanelPosition);
    window.addEventListener('scroll', updateLangPanelPosition, true);
    return () => {
      window.removeEventListener('resize', updateLangPanelPosition);
      window.removeEventListener('scroll', updateLangPanelPosition, true);
    };
  }, [isLangMenuOpen, updateLangPanelPosition]);

  useEffect(() => {
    if (!profileOpen) return;
    updateProfilePanelPosition();
    window.addEventListener('resize', updateProfilePanelPosition);
    window.addEventListener('scroll', updateProfilePanelPosition, true);
    return () => {
      window.removeEventListener('resize', updateProfilePanelPosition);
      window.removeEventListener('scroll', updateProfilePanelPosition, true);
    };
  }, [profileOpen, updateProfilePanelPosition]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (isNavSurfaceTarget(e.target as Node)) return;
      setProfileOpen(false);
      setIsLangMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [isNavSurfaceTarget]);

  const closeProfile = () => setProfileOpen(false);

  const openTutorialFromNav = () => {
    setIsLangMenuOpen(false);
    closeProfile();
    closeMobileProfileMenu();
    openTutorial();
  };

  const goProfileRoute = (path: string) => {
    closeProfile();
    navigate(path);
  };

  const doLogout = async () => {
    closeProfile();
    closeMobileProfileMenu();
    await signOut();
    redirectToLoginAfterSignOut();
  };

  const changeLanguage = (nextLanguage: 'en' | 'pt' | 'fr') => {
    setLanguage(nextLanguage);
    setIsLangMenuOpen(false);
    if (isConnected && isConfigured && session) {
      void updateProfile({ preferred_language: nextLanguage });
    }
  };

  return (
    <>
    <nav className={`sticky top-0 z-50 ${usePremiumNav ? 'lh-nav-premium' : 'border-b bg-white border-gray-100 backdrop-blur-xl'}`}>
      {usePremiumNav ? (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(102deg,#0A63B8_0%,#07427D_18%,#031A3B_46%,#020817_76%,#00040F_100%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(63,170,255,0.28)_0%,rgba(22,119,255,0.12)_28%,rgba(0,212,255,0.09)_48%,transparent_76%)]"
          />
          <div aria-hidden className="lh-nav-shine" />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-[#80CCFF]/75 via-[#1B8FFF]/55 to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute left-0 top-0 h-full w-[34rem] bg-[radial-gradient(circle_at_4rem_50%,rgba(70,180,255,0.38),rgba(0,109,255,0.18)_34%,transparent_68%)]"
          />
        </>
      ) : null}
      <div className="lh-nav-inner relative w-full max-w-none px-4 sm:mx-auto sm:max-w-7xl sm:px-6 lg:px-8">
        <div className="flex justify-between h-[60px] md:h-[72px]">
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => navigate(logoTarget)}
              className={clsx(
                'lh-nav-brand flex items-center rounded-2xl transition-opacity hover:opacity-90',
              )}
            >
              <span className="lh-nav-brand-icon">
                <img
                  src="/brand/linkhelp-handshake-icon.png"
                  alt=""
                  className="h-11 w-11 object-contain md:h-14 md:w-14"
                  loading="eager"
                  decoding="async"
                />
              </span>
              <span className="lh-nav-brand-name-wrap" aria-label="Link Help">
                <span className="lh-nav-brand-name">Link Help</span>
              </span>
            </button>
          </div>

          <div ref={navControlsRef} className={clsx('hidden md:flex md:items-center md:space-x-8', usePremiumNav && 'lh-nav-controls rounded-full px-3 py-2 backdrop-blur-xl')}>
            {isConnected ? (
              <>
                <button
                  type="button"
                  onClick={openTutorialFromNav}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition-colors focus:outline-none ${usePremiumNav ? 'lh-nav-link text-slate-100/92 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  <GraduationCap className="h-4 w-4" />
                  <span>{t('nav.tutorial')}</span>
                </button>

                <div className="relative">
                  <button
                    ref={langButtonRef}
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      setIsLangMenuOpen((o) => !o);
                    }}
                    className={`flex items-center space-x-1 rounded-full px-3 py-2 transition-colors focus:outline-none ${usePremiumNav ? 'lh-nav-link text-slate-100/92 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
                    aria-expanded={isLangMenuOpen}
                    aria-haspopup="true"
                  >
                    <Globe className="w-4 h-4" />
                    <span className="text-sm font-medium uppercase">{language}</span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${isLangMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                <div className={clsx('flex items-center space-x-4 pl-4', usePremiumNav ? 'border-l border-white/15' : 'border-l border-gray-200')}>
                  <NotificationsDropdown userId={userId} />
                  {isConfigured && session ? (
                    <div className="relative">
                      <button
                        ref={profileButtonRef}
                        type="button"
                        onClick={() => {
                          setIsLangMenuOpen(false);
                          setProfileOpen((o) => !o);
                        }}
                        className="flex items-center gap-1.5 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                        aria-expanded={profileOpen}
                        aria-haspopup="true"
                      >
                        <img
                          src={userAvatar}
                          alt=""
                          className="w-9 h-9 rounded-full border-2 border-gray-100 object-cover hover:border-blue-100 transition-colors"
                        />
                        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => navigate(ROUTES.settings)}
                      className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                    >
                      <img src={userAvatar} alt="" className="w-9 h-9 rounded-full border-2 border-gray-100 object-cover" />
                    </button>
                  )}
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={(event) => toggleMobileProfileMenu(event.currentTarget)}
                className="rounded-full p-0.5 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                aria-label={t('mobile_nav.guest_menu')}
                aria-expanded={mobileProfileOpen}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                  <User className="h-4 w-4" />
                </span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 md:hidden">
            {isConnected ? (
              <button
                type="button"
                onClick={openTutorialFromNav}
                className="relative rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                aria-label={t('nav.tutorial')}
              >
                <GraduationCap className="h-4 w-4" />
              </button>
            ) : null}
            {isConnected ? <NotificationsDropdown userId={userId} compact /> : null}
            <button
              type="button"
              onClick={(event) => toggleMobileProfileMenu(event.currentTarget)}
              className="rounded-full p-0.5 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              aria-label={isConnected ? t('mobile_nav.profile_menu') : t('mobile_nav.guest_menu')}
              aria-expanded={mobileProfileOpen}
            >
              {isConnected ? (
                <img src={userAvatar} alt="" className="h-8 w-8 rounded-full border-2 border-white object-cover shadow-sm" loading="lazy" decoding="async" />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                  <User className="h-4 w-4" />
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {isLangMenuOpen
        ? createPortal(
            <div
              ref={langPanelRef}
              style={langPanelStyle}
              className="hidden md:block rounded-xl border border-gray-100 bg-white py-2 shadow-xl shadow-slate-900/10 animate-in fade-in zoom-in-95 duration-150"
              role="menu"
              onMouseDown={(e) => e.stopPropagation()}
            >
              {APP_UI_LANGUAGES.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  role="menuitem"
                  onClick={() => changeLanguage(option.code)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${language === option.code ? 'font-bold text-blue-600' : 'text-gray-700'}`}
                >
                  {t(option.labelKey)}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}

      {profileOpen
        ? createPortal(
            <div
              ref={profilePanelRef}
              style={profilePanelStyle}
              className="hidden md:block rounded-2xl border border-gray-100 bg-white py-2 shadow-xl shadow-slate-900/10 animate-in fade-in zoom-in-95 duration-150"
              role="menu"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => goProfileRoute(isHelperNav ? ROUTES.helperDashboard : ROUTES.clientDashboard)}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-gray-800 hover:bg-gray-50"
              >
                <Home className="w-4 h-4 text-gray-400" /> {t('sidebar.dashboard')}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => goProfileRoute(ROUTES.messages)}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-gray-800 hover:bg-gray-50"
              >
                <MessageCircle className="w-4 h-4 text-gray-400" /> {t('messages_page.title')}
              </button>
              {isHelperNav ? (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => goProfileRoute(ROUTES.helperPerformance)}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-gray-800 hover:bg-gray-50"
                  >
                    <Activity className="w-4 h-4 text-gray-400" /> {t('helper_dashboard.nav_performance')}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => goProfileRoute(ROUTES.helperJobs)}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-gray-800 hover:bg-gray-50"
                  >
                    <Briefcase className="w-4 h-4 text-gray-400" /> {t('helper_dashboard.nav_active_services')}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => goProfileRoute(ROUTES.helperLinkCredits)}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-gray-800 hover:bg-gray-50"
                  >
                    <Package className="w-4 h-4 text-gray-400" /> {t('nav.profile_menu_packages')}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => goProfileRoute(ROUTES.clientJobs)}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-gray-800 hover:bg-gray-50"
                >
                  <Briefcase className="w-4 h-4 text-gray-400" /> {t('sidebar.active_services')}
                </button>
              )}
              <button
                type="button"
                role="menuitem"
                onClick={() => goProfileRoute(ROUTES.profile)}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-gray-800 hover:bg-gray-50"
              >
                <User className="w-4 h-4 text-gray-400" /> {t('nav.profile_menu_profile')}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={openTutorialFromNav}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-gray-800 hover:bg-gray-50"
              >
                <GraduationCap className="w-4 h-4 text-gray-400" /> {t('nav.tutorial')}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => goProfileRoute(ROUTES.settings)}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-gray-800 hover:bg-gray-50"
              >
                <Settings className="w-4 h-4 text-gray-400" /> {t('nav.profile_menu_settings')}
              </button>
              <div className="my-1 border-t border-gray-100" />
              <button
                type="button"
                role="menuitem"
                onClick={() => void doLogout()}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-bold text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" /> {t('nav.profile_menu_logout')}
              </button>
            </div>,
            document.body,
          )
        : null}
    </nav>
  </>
  );
}
