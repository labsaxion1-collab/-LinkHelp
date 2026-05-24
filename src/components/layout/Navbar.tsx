import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Activity, Briefcase, Globe, ChevronDown, Home, MessageCircle, User, LogOut } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Logo } from '@/components/ui/Logo';
import { useLanguage } from '@/context/LanguageContext';
import { useSessionViewer } from '@/hooks/useSessionViewer';
import { useAuth } from '@/context/AuthContext';
import { ROUTES } from '@/utils/constants';
import { useToast } from '@/context/ToastContext';
import { isAppShellPath } from '@/utils/navigation';
import { NotificationsDropdown } from './NotificationsDropdown';
import { MobileProfileMenu } from '@/components/layout/MobileProfileMenu';
import { clsx } from 'clsx';

export default function Navbar() {
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const desktopProfileRef = useRef<HTMLDivElement>(null);

  const isConnected = isAppShellPath(location.pathname);
  const me = useSessionViewer();
  const userAvatar = me.avatar;
  const userId = me.id;
  const { signOut, isConfigured, session, profile } = useAuth();

  const isHelperNav = profile?.role === 'helper';
  const isHome = location.pathname === ROUTES.home;
  const usePremiumNav = isHome || location.pathname === ROUTES.login || isConnected;
  const logoTarget = isConnected
    ? isHelperNav
      ? ROUTES.helperOpportunities
      : ROUTES.clientDashboard
    : ROUTES.home;

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
    <nav className={`sticky top-0 z-50 border-b ${usePremiumNav ? 'lh-nav-premium' : 'bg-white border-gray-100 backdrop-blur-xl'}`}>
      {usePremiumNav ? (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(100deg,#8DCAE3_0%,#6CB5D2_14%,#2D719B_35%,#102D48_64%,#050816_100%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.36)_0%,rgba(255,255,255,0.14)_20%,rgba(0,212,255,0.08)_45%,transparent_72%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-white/75 via-[#9BE7FF]/45 to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-white/20 via-[#33B6FF]/50 to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute left-0 top-0 h-full w-[34rem] bg-[radial-gradient(circle_at_4rem_50%,rgba(255,255,255,0.42),rgba(155,231,255,0.18)_34%,transparent_68%)]"
          />
        </>
      ) : null}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-[72px]">
          <div className="flex items-center">
            <Link
              to={logoTarget}
              className={clsx(
                'flex items-center rounded-2xl transition-all',
                usePremiumNav && 'px-3 py-2 ring-1 ring-white/16 bg-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_14px_38px_rgba(0,0,0,0.16)] backdrop-blur-md hover:bg-white/[0.1]',
              )}
            >
              <Logo tone="dark" />
            </Link>
          </div>

          <div className={clsx('hidden md:flex md:items-center md:space-x-8', usePremiumNav && 'rounded-full border border-white/10 bg-[#050816]/20 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-xl')}>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                className={`flex items-center space-x-1 rounded-full px-3 py-2 transition-colors focus:outline-none ${usePremiumNav ? 'text-slate-100/92 hover:bg-white/10 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
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
                <div className={clsx('flex items-center space-x-4 pl-4', usePremiumNav ? 'border-l border-white/15' : 'border-l border-gray-200')}>
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
                    className={`font-semibold text-sm transition-colors ${usePremiumNav ? 'rounded-full px-4 py-2 text-slate-100/92 hover:bg-white/10 hover:text-white' : 'text-gray-900 hover:text-primary-600'}`}
                  >
                    {t('nav.login')}
                  </Link>
                  <Link
                    to={ROUTES.signup}
                    className={`${usePremiumNav ? 'bg-gradient-to-r from-[#1677FF] via-[#1B8FFF] to-[#00D4FF] shadow-[0_0_0_1px_rgba(255,255,255,0.18)_inset,0_16px_42px_rgba(22,119,255,0.42)] hover:brightness-110 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.22)_inset,0_20px_55px_rgba(0,212,255,0.35)]' : 'bg-primary-600 hover:bg-primary-700 shadow-sm'} text-white px-5 py-2.5 rounded-full text-sm font-bold transition-all`}
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
      />
    </nav>
  </>
  );
}
