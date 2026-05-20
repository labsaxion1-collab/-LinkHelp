import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Globe, ChevronDown, User, Settings, Briefcase, LogOut, Camera, Coins } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Logo } from '@/components/ui/Logo';
import { useLanguage } from '@/context/LanguageContext';
import { useSessionViewer } from '@/hooks/useSessionViewer';
import { useAuth } from '@/context/AuthContext';
import { UI_VISIBILITY } from '@/config/uiVisibility';
import { ROUTES } from '@/utils/constants';
import { useAppMode } from '@/context/AppModeContext';
import { useToast } from '@/context/ToastContext';
import { isAppShellPath, isHelperArea, pathImpliesAppMode } from '@/utils/navigation';
import { NotificationsDropdown } from './NotificationsDropdown';
import { HelperTermsGateModal } from '@/components/auth/HelperTermsGateModal';

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [helperTermsOpen, setHelperTermsOpen] = useState(false);
  const [helperTermsSaving, setHelperTermsSaving] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const desktopProfileRef = useRef<HTMLDivElement>(null);
  const mobileProfileRef = useRef<HTMLDivElement>(null);

  const isConnected = isAppShellPath(location.pathname);
  const { mode, switchToClient, switchToHelper } = useAppMode();
  const me = useSessionViewer();
  const userAvatar = me.avatar;
  const userId = me.id;
  const { signOut, isConfigured, session, profile, updateProfile } = useAuth();

  const isHelperNav =
    isHelperArea(location.pathname) || (pathImpliesAppMode(location.pathname) === null && mode === 'helper');
  const helperTermsStorageKey = userId ? `linkhelp:helper-terms:${userId}` : '';

  const goHelperOrPrompt = () => {
    const acceptedLocally =
      helperTermsStorageKey && typeof window !== 'undefined'
        ? window.localStorage.getItem(helperTermsStorageKey) === 'true'
        : false;
    if (profile && profile.helper_terms_accepted !== true && !acceptedLocally) {
      setHelperTermsOpen(true);
      return;
    }
    switchToHelper();
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
    setIsMobileMenuOpen(false);
    switchToHelper();
  };

  const toggleClientHelper = () => {
    if (isHelperNav) {
      switchToClient();
    } else {
      goHelperOrPrompt();
    }
  };

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      const inDesktop = desktopProfileRef.current?.contains(t);
      const inMobile = mobileProfileRef.current?.contains(t);
      if (!inDesktop && !inMobile) setProfileOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const doLogout = async () => {
    await signOut();
    showToast(t('nav.toast_logout'), 'success');
    navigate(ROUTES.login, { replace: true });
    setProfileOpen(false);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to={ROUTES.home} className="flex items-center">
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
              className="text-gray-500 hover:text-gray-900 font-medium text-sm transition-colors"
            >
              {isHelperNav ? t('nav.switch_to_client') : t('nav.switch_to_helper')}
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
                          {isHelperNav ? (
                            <button
                              type="button"
                              onClick={() => {
                                setProfileOpen(false);
                                navigate(ROUTES.helperDashboard, { state: { openProfile: true } });
                              }}
                              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-gray-800 hover:bg-gray-50"
                            >
                              <User className="w-4 h-4 text-gray-400" /> {t('nav.profile_menu_profile')}
                            </button>
                          ) : (
                          <Link
                            to={ROUTES.settings}
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                          >
                            <User className="w-4 h-4 text-gray-400" /> {t('nav.profile_menu_profile')}
                          </Link>
                          )}
                          {isHelperNav && UI_VISIBILITY.helperCredits ? (
                            <Link
                              to={ROUTES.helperCredits}
                              onClick={() => setProfileOpen(false)}
                              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                            >
                              <Coins className="w-4 h-4 text-gray-400" /> {t('helper_dashboard.credits_wallet_title')}
                            </Link>
                          ) : null}
                          <Link
                            to={ROUTES.settings}
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                          >
                            <Settings className="w-4 h-4 text-gray-400" /> {t('nav.profile_menu_settings')}
                          </Link>
                          {!isHelperNav ? (
                            <>
                              <Link
                                to={`${ROUTES.settings}#avatar`}
                                onClick={() => setProfileOpen(false)}
                                className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                              >
                                <Camera className="w-4 h-4 text-gray-400" /> {t('nav.profile_menu_change_photo')}
                              </Link>
                              <button
                                type="button"
                                onClick={() => {
                                  setProfileOpen(false);
                                  toggleClientHelper();
                                }}
                                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-gray-800 hover:bg-gray-50"
                              >
                                <Briefcase className="w-4 h-4 text-gray-400" />
                                {t('nav.switch_to_helper')}
                              </button>
                            </>
                          ) : null}
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

          <div className="flex items-center md:hidden space-x-4">
            {isConnected && isConfigured && session ? (
              <div className="relative" ref={mobileProfileRef}>
                <button
                  type="button"
                  onClick={() => setProfileOpen((o) => !o)}
                  className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                >
                  <img src={userAvatar} alt="" className="w-8 h-8 rounded-full border-2 border-gray-100 object-cover" />
                </button>
                {profileOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-gray-100 bg-white py-2 shadow-xl z-[60]">
                    {isHelperNav ? (
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false);
                          navigate(ROUTES.helperDashboard, { state: { openProfile: true } });
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-gray-800 hover:bg-gray-50"
                      >
                        <User className="w-4 h-4 text-gray-400" />
                        {t('nav.profile_menu_profile')}
                      </button>
                    ) : (
                      <Link to={ROUTES.settings} onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50">
                        <User className="w-4 h-4 text-gray-400" />
                        {t('nav.profile_menu_profile')}
                      </Link>
                    )}
                    {isHelperNav && UI_VISIBILITY.helperCredits ? (
                      <Link to={ROUTES.helperCredits} onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50">
                        <Coins className="w-4 h-4 text-gray-400" />
                        {t('helper_dashboard.credits_wallet_title')}
                      </Link>
                    ) : null}
                    <Link to={ROUTES.settings} onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50">
                      <Settings className="w-4 h-4 text-gray-400" />
                      {t('nav.profile_menu_settings')}
                    </Link>
                    {!isHelperNav ? (
                      <>
                        <Link
                          to={`${ROUTES.settings}#avatar`}
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                        >
                          <Camera className="w-4 h-4 text-gray-400" />
                          {t('nav.profile_menu_change_photo')}
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setProfileOpen(false);
                            toggleClientHelper();
                          }}
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-gray-800 hover:bg-gray-50"
                        >
                          <Briefcase className="w-4 h-4 text-gray-400" />
                          {t('nav.switch_to_helper')}
                        </button>
                      </>
                    ) : null}
                    <div className="my-1 border-t border-gray-100" />
                    <button type="button" onClick={() => void doLogout()} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-bold text-red-600 hover:bg-red-50">
                      <LogOut className="w-4 h-4" />
                      {t('nav.profile_menu_logout')}
                    </button>
                  </div>
                )}
              </div>
            ) : isConnected ? (
              <Link to={ROUTES.settings} className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
                <img src={userAvatar} alt="" className="w-8 h-8 rounded-full border-2 border-gray-100 object-cover" />
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-3 rounded-xl text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <>
          <button
            type="button"
            className="md:hidden fixed inset-0 z-[55] bg-gray-900/40 backdrop-blur-sm"
            aria-label={t('common.close')}
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="md:hidden fixed inset-x-0 top-16 bottom-0 z-[56] border-t border-gray-100 bg-white shadow-2xl flex flex-col max-h-[calc(100dvh-4rem)]">
            <div className="flex-1 overflow-y-auto overscroll-contain pt-2 pb-3 space-y-1 ios-scroll">
              <button
                type="button"
                onClick={() => {
                  switchToClient();
                  setIsMobileMenuOpen(false);
                }}
                className="block w-full text-left px-4 py-3.5 min-h-[48px] text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              >
                {t('nav.find_help_mobile')}
              </button>
              <button
                type="button"
                onClick={() => {
                  goHelperOrPrompt();
                  setIsMobileMenuOpen(false);
                }}
                className="block w-full text-left px-4 py-3.5 min-h-[48px] text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              >
                {t('nav.become_helper')}
              </button>

              <div className="px-4 py-3 border-t border-gray-100 mt-2">
                <span className="block text-sm text-gray-500 mb-2">{t('nav.language_label')}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setLanguage('en')}
                    className={`px-3 py-1.5 rounded-lg text-sm border ${language === 'en' ? 'border-primary-500 text-primary-600 bg-primary-50' : 'border-gray-200'}`}
                  >
                    EN
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage('pt')}
                    className={`px-3 py-1.5 rounded-lg text-sm border ${language === 'pt' ? 'border-primary-500 text-primary-600 bg-primary-50' : 'border-gray-200'}`}
                  >
                    PT
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage('fr')}
                    className={`px-3 py-1.5 rounded-lg text-sm border ${language === 'fr' ? 'border-primary-500 text-primary-600 bg-primary-50' : 'border-gray-200'}`}
                  >
                    FR
                  </button>
                </div>
              </div>

              {isConnected ? (
                <div className="border-t border-gray-100 my-2 pt-2 space-y-1 px-2">
                  <Link
                    to={ROUTES.settings}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block rounded-lg px-3 py-3 text-base font-medium text-gray-900 hover:bg-gray-50"
                  >
                    {t('nav.profile_menu_settings')}
                  </Link>
                  {UI_VISIBILITY.clientCredits ? (
                    <Link
                      to={ROUTES.payments}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block rounded-lg px-3 py-3 text-base font-medium text-gray-900 hover:bg-gray-50"
                    >
                      {t('nav.profile_menu_credits')}
                    </Link>
                  ) : null}
                  {isConfigured && session ? (
                    <button
                      type="button"
                      onClick={() => void doLogout()}
                      className="block w-full text-left rounded-lg px-3 py-3 text-base font-medium text-red-600 hover:bg-red-50"
                    >
                      {t('nav.profile_menu_logout')}
                    </button>
                  ) : (
                    <Link
                      to={ROUTES.login}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block rounded-lg px-3 py-3 text-base font-medium text-gray-900 hover:bg-gray-50"
                    >
                      {t('nav.login')}
                    </Link>
                  )}
                </div>
              ) : (
                <div className="border-t border-gray-100 my-2 pt-2">
                  <Link to={ROUTES.login} onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-3.5 min-h-[48px] text-base font-medium text-gray-900">
                    {t('nav.login')}
                  </Link>
                  <Link to={ROUTES.signup} onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-3.5 min-h-[48px] text-base font-medium text-primary-600">
                    {t('nav.signup')}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </>
      )}
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
