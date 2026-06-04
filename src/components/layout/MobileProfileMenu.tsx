import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { User, Bookmark, Settings, Globe, LogOut, X, Home, MessageCircle, Briefcase } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useAppMode } from '@/context/AppModeContext';
import { useToast } from '@/context/ToastContext';
import { ROUTES } from '@/utils/constants';
import type { AppLanguage } from '@/services/translationService';

type Props = {
  open: boolean;
  onClose: () => void;
  isConnected: boolean;
  isHelperNav: boolean;
};

export function MobileProfileMenu({
  open,
  onClose,
  isConnected,
  isHelperNav,
}: Props) {
  const { t, language, setLanguage } = useLanguage();
  const { signOut, isConfigured, session, updateProfile } = useAuth();
  const { setMode } = useAppMode();
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const setLang = (lang: AppLanguage) => {
    setLanguage(lang);
    if (isConnected && isConfigured && session) {
      void updateProfile({ preferred_language: lang });
    }
    onClose();
  };

  const logout = async () => {
    await signOut();
    showToast(t('nav.toast_logout'), 'success');
    onClose();
    navigate(ROUTES.login, { replace: true });
  };

  const go = (path: string) => {
    onClose();
    navigate(path);
  };

  const goFavorites = () => {
    onClose();
    navigate(ROUTES.clientDashboard, { state: { tab: 'saved' } });
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] md:hidden" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
        aria-label={t('common.close')}
        onClick={onClose}
      />
      <div
        className="absolute inset-x-3 bottom-[max(1rem,env(safe-area-inset-bottom))] max-h-[min(85dvh,calc(100dvh-5rem))] overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-200"
        role="menu"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <p className="text-sm font-black text-gray-900">{t('mobile_nav.profile_menu')}</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
            aria-label={t('common.close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[calc(85dvh-4rem-env(safe-area-inset-bottom))] overflow-y-auto overscroll-contain py-1">
          {isConnected ? (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={() =>
                  go(isHelperNav ? ROUTES.helperDashboard : ROUTES.clientDashboard)
                }
                className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                <Home className="h-4 w-4 text-slate-400" />
                {t('sidebar.dashboard')}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => go(ROUTES.messages)}
                className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                <MessageCircle className="h-4 w-4 text-slate-400" />
                {t('messages_page.title')}
              </button>
              {isHelperNav ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => go(ROUTES.helperJobs)}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  <Briefcase className="h-4 w-4 text-slate-400" />
                  {t('helper_dashboard.nav_active_services')}
                </button>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => go(ROUTES.clientJobs)}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  <Briefcase className="h-4 w-4 text-slate-400" />
                  {t('sidebar.active_services')}
                </button>
              )}
              {isHelperNav ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onClose();
                    navigate(ROUTES.helperDashboard, { state: { openProfile: true } });
                  }}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  <User className="h-4 w-4 text-slate-400" />
                  {t('nav.profile_menu_profile')}
                </button>
              ) : (
                <Link
                  to={ROUTES.settings}
                  role="menuitem"
                  onClick={onClose}
                  className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  <User className="h-4 w-4 text-slate-400" />
                  {t('nav.profile_menu_profile')}
                </Link>
              )}
              {!isHelperNav ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={goFavorites}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  <Bookmark className="h-4 w-4 text-slate-400" />
                  {t('nav.profile_menu_favorites')}
                </button>
              ) : null}
              <Link
                to={ROUTES.settings}
                role="menuitem"
                onClick={onClose}
                className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                <Settings className="h-4 w-4 text-slate-400" />
                {t('nav.profile_menu_settings')}
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onClose();
                  setMode(isHelperNav ? 'client' : 'helper');
                }}
                className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                <Briefcase className="h-4 w-4 text-slate-400" />
                {t(isHelperNav ? 'nav.switch_to_client' : 'nav.switch_to_helper')}
              </button>
              <div className="my-1 border-t border-slate-100 px-4 py-3">
                <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  <Globe className="h-3.5 w-3.5" />
                  {t('nav.language_label')}
                </p>
                <div className="flex gap-2">
                  {(['en', 'pt', 'fr'] as AppLanguage[]).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setLang(lang)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold border ${
                        language === lang
                          ? 'border-primary-500 bg-primary-50 text-primary-600'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      {lang.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              {isConfigured && session ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void logout()}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-bold text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  {t('nav.profile_menu_logout')}
                </button>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
