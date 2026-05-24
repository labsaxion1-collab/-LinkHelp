import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Bookmark, Settings, Globe, LogOut, Briefcase } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useAppMode } from '@/context/AppModeContext';
import { useToast } from '@/context/ToastContext';
import { ROUTES } from '@/utils/constants';
import { isHelperArea } from '@/utils/navigation';
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
  const { signOut, isConfigured, session } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, onClose]);

  const setLang = (lang: AppLanguage) => {
    setLanguage(lang);
    onClose();
  };

  const logout = async () => {
    await signOut();
    showToast(t('nav.toast_logout'), 'success');
    onClose();
    navigate(ROUTES.login, { replace: true });
  };

  const goFavorites = () => {
    onClose();
    navigate(ROUTES.clientDashboard, { state: { tab: 'saved' } });
  };

  if (!open) return null;

  return (
    <>
      <div className="md:hidden fixed inset-0 z-[55] bg-slate-900/20" aria-hidden onClick={onClose} />
      <div
        ref={panelRef}
        className="md:hidden fixed top-[4.25rem] right-3 z-[60] w-[min(18rem,calc(100vw-1.5rem))] rounded-2xl border border-slate-100 bg-white py-2 shadow-xl shadow-slate-900/10 animate-in fade-in zoom-in-95 duration-150"
        role="menu"
      >
        {isConnected ? (
          <>
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
            <div className="my-1 border-t border-slate-100 px-4 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-2">
                {t('nav.language_label')}
              </p>
              <div className="flex gap-2">
                {(['en', 'pt', 'fr'] as AppLanguage[]).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setLang(lang)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold border ${
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
    </>
  );
}
