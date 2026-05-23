import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Activity, Briefcase, Globe, ChevronDown, Home, MessageCircle, User, LogOut } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Logo } from '@/components/ui/Logo';
import { useLanguage } from '@/context/LanguageContext';
import { useSessionViewer } from '@/hooks/useSessionViewer';
import { useAuth } from '@/context/AuthContext';
import { ROUTES } from '@/utils/constants';
import { useAppMode } from '@/context/AppModeContext';
import { useToast } from '@/context/ToastContext';
import { isAppShellPath, isHelperArea, pathImpliesAppMode } from '@/utils/navigation';
import { NotificationsDropdown } from './NotificationsDropdown';
import { HelperTermsGateModal } from '@/components/auth/HelperTermsGateModal';
import { MobileProfileMenu } from '@/components/layout/MobileProfileMenu';

export default function Navbar() {
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [helperTermsOpen, setHelperTermsOpen] = useState(false);
  const [helperTermsSaving, setHelperTermsSaving] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const desktopProfileRef = useRef<HTMLDivElement>(null);

  const isConnected = isAppShellPath(location.pathname);
  const { mode, modeSwitchBusy, switchToClient, switchToHelper } = useAppMode();
  const me = useSessionViewer();
  const userAvatar = me.avatar;
  const userId = me.id;
  const { signOut, isConfigured, session, profile, updateProfile } = useAuth();

  const isHelperNav =
    isHelperArea(location.pathname) || (pathImpliesAppMode(location.pathname) === null && mode === 'helper');
  const helperTermsStorageKey = userId ? `linkhelp:helper-terms:${userId}` : '';
  const logoTarget = isConnected
    ? isHelperNav
      ? ROUTES.helperOpportunities
      : ROUTES.clientDashboard
    : ROUTES.home;

  const runModeSwitch = async (target: 'client' | 'helper', skipHelperPrep = false) => {
    if (modeSwitchBusy) return;
    const ok =
      target === 'helper'
        ? await switchToHelper(skipHelperPrep ? { skipHelperPrep: true } : undefined)
        : await switchToClient();
    if (!ok) {
      showToast(t('nav.mode_switch_failed'), 'error');
    }
  };

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
    void runModeSwitch('helper');
  };

  const confirmNavbarHelperTerms = async () => {
    setHelperTermsSaving(true);
    const err = await updateProfile({
      helper_terms_accepted: true,
      helper_terms_accepted_at: new Date().toISOString(),
    });
    setHelperTermsSaving(false);
    if (err) {
      if (import.meta.env.DEV && err.devRaw) console.info('[LinkHelp] updateProfile raw:', err.devRaw);
    }
    if (helperTermsStorageKey && typeof window !== 'undefined') {
      window.localStorage.setItem(helperTermsStorageKey, 'true');
    }
    setHelperTermsOpen(false);
    setProfileOpen(false);
    setMobileProfileOpen(false);
    await runModeSwitch('helper', true);
  };

  const toggleClientHelper = () => {
    if (modeSwitchBusy) return;
    if (isHelperNav) {
      void runModeSwitch('client');
    } else {
      goHelperOrPrompt();
    }
  };

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      const inDesktop = desktopProfileRef.current?.contains(t);
      if (!inDesktop) setProfileOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const doLogout = async () => {
    await signOut();
    showToast(t('nav.toast_logout'), 'success');
    navigate(ROUTES.login, { replace: true });
    setProfileOpen(false);
    setMobileProfileOpen(false);
  };

  return (
    <>
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to={logoTarget} className="flex items-center">
              <Logo />
            </Link>
          </div>

          <div className="hidden md:flex md:items-center md:space-x-8">
            <Link
              to={ROUTES.clientDashboard}
              className="text-gray-500 hover:text-gray-900 font-medium text-sm transition-colors"
            >
              {t('nav.find_help')}
            </Link>
            <button
              type="button"
              onClick={toggleClientHelper}
              disabled={modeSwitchBusy}
              className="text-gray-500 hover:text-gray-900 font-medium text-sm transition-colors disabled:opacity-60"
            >
              {modeSwitchBusy
                ? t('common.loading')
                : isHelperNav
                  ? t('nav.switch_to_client')
                  : t('nav.switch_to_helper')}
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                className="flex items-center space-x-1 text-gray-500 hover:text-gray-900 transition-colors focus:outline-none"
              >
                <Globe className="w-4 h-4" />
                <span className="text-sm font-medium uppercase">{language}</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {isLangMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-32 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                  <button
                    type="button"
                    onClick={() => {
                      setLanguage('en');
                      setIsLangMenuOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${language === 'en' ? 'font-bold text-blue-600' : 'text-gray-700'}`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLanguage('pt');
                      setIsLangMenuOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${language === 'pt' ? 'font-bold text-blue-600' : 'text-gray-700'}`}
                  >
                    Português
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLanguage('fr');
                      setIsLangMenuOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${language === 'fr' ? 'font-bold text-blue-600' : 'text-gray-700'}`}
                  >
                    Français
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-4 ml-4">
              {isConnected ? (
                <div className="flex items-center space-x-4 pl-4 border-l border-gray-200">
                  <NotificationsDropdown userId={userId} />
                  {isConfigured && session ? (
                    <div className="relative" ref={desktopProfileRef}>
                      <button
                        type="button"
                        onClick={() => setProfileOpen((o) => !o)}
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
                      {profileOpen && (
                        <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-gray-100 bg-white py-2 shadow-xl shadow-slate-900/10 z-[60] animate-in fade-in zoom-in-95 duration-150">
                          <Link
                            to={isHelperNav ? ROUTES.helperDashboard : ROUTES.clientDashboard}
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                          >
                            <Home className="w-4 h-4 text-gray-400" /> {t('sidebar.dashboard')}
                          </Link>
                          <Link
                            to={ROUTES.messages}
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                          >
                            <MessageCircle className="w-4 h-4 text-gray-400" /> {t('messages_page.title')}
                          </Link>
                          {isHelperNav ? (
                            <>
                              <Link
                                to={ROUTES.helperPerformance}
                                onClick={() => setProfileOpen(false)}
                                className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                              >
                                <Activity className="w-4 h-4 text-gray-400" /> {t('helper_dashboard.nav_performance')}
                              </Link>
                              <Link
                                to={ROUTES.helperJobs}
                                onClick={() => setProfileOpen(false)}
                                className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                              >
                                <Briefcase className="w-4 h-4 text-gray-400" /> {t('helper_dashboard.nav_active_services')}
                              </Link>
                            </>
                          ) : (
                            <Link
                              to={ROUTES.clientJobs}
                              onClick={() => setProfileOpen(false)}
                              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                            >
                              <Briefcase className="w-4 h-4 text-gray-400" /> {t('sidebar.active_services')}
                            </Link>
                          )}
                          <Link
                            to={ROUTES.settings}
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                          >
                            <User className="w-4 h-4 text-gray-400" /> {t('nav.profile_menu_profile')}
                          </Link>
                          <div className="my-1 border-t border-gray-100" />
                          <button
                            type="button"
                            onClick={() => void doLogout()}
                            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-bold text-red-600 hover:bg-red-50"
                          >
                            <LogOut className="w-4 h-4" /> {t('nav.profile_menu_logout')}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Link to={ROUTES.settings} className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
                      <img src={userAvatar} alt="" className="w-9 h-9 rounded-full border-2 border-gray-100 object-cover" />
                    </Link>
                  )}
                </div>
              ) : (
                <>
                  <Link
                    to={ROUTES.login}
                    className="text-gray-900 font-medium text-sm hover:text-primary-600 transition-colors"
                  >
                    {t('nav.login')}
                  </Link>
                  <Link
                    to={ROUTES.signup}
                    className="bg-primary-600 text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm"
                  >
                    {t('nav.signup')}
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            {isConnected ? <NotificationsDropdown userId={userId} /> : null}
            <button
              type="button"
              onClick={() => {
                if (!isConnected) {
                  navigate(ROUTES.login);
                  return;
                }
                setMobileProfileOpen((o) => !o);
              }}
              className="rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              aria-label={isConnected ? t('mobile_nav.profile_menu') : t('nav.login')}
              aria-expanded={mobileProfileOpen}
            >
              {isConnected ? (
                <img src={userAvatar} alt="" className="h-10 w-10 rounded-full border-2 border-white object-cover shadow-sm" />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                  <User className="h-5 w-5" />
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <MobileProfileMenu
        open={mobileProfileOpen && isConnected}
        onClose={() => setMobileProfileOpen(false)}
        isConnected={isConnected}
        isHelperNav={isHelperNav}
        onSwitchMode={toggleClientHelper}
        modeSwitchBusy={modeSwitchBusy}
      />
    </nav>
    <HelperTermsGateModal
      open={helperTermsOpen}
      onClose={() => setHelperTermsOpen(false)}
      onConfirm={() => void confirmNavbarHelperTerms()}
      loading={helperTermsSaving}
    />
  </>
  );
}
