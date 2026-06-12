import { useEffect, useLayoutEffect, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { User, Bookmark, Globe, LogOut, X, Home, MessageCircle, Briefcase, Package, Settings } from 'lucide-react';
import { redirectToLoginAfterSignOut } from '@/utils/authRedirect';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { ROUTES } from '@/utils/constants';
import type { AppLanguage } from '@/services/translationService';

type Props = {
  open: boolean;
  onClose: () => void;
  anchorEl: HTMLElement | null;
  isConnected: boolean;
  isHelperNav: boolean;
};

type PanelPosition = CSSProperties & {
  maxHeight?: string;
};

function computePanelPosition(anchor: HTMLElement): PanelPosition {
  const rect = anchor.getBoundingClientRect();
  const panelWidth = Math.min(288, window.innerWidth - 24);
  const horizontalPadding = 12;
  const left = Math.min(
    Math.max(horizontalPadding, rect.right - panelWidth),
    window.innerWidth - panelWidth - horizontalPadding,
  );
  const opensAbove = rect.top > window.innerHeight * 0.55;
  const gap = 10;

  if (opensAbove) {
    const spaceAbove = rect.top - gap - 16;
    return {
      position: 'fixed',
      bottom: window.innerHeight - rect.top + gap,
      left,
      width: panelWidth,
      maxHeight: `${Math.max(220, Math.min(spaceAbove, window.innerHeight * 0.72))}px`,
      zIndex: 130,
    };
  }

  return {
    position: 'fixed',
    top: rect.bottom + gap,
    left,
    width: panelWidth,
    maxHeight: `${Math.min(window.innerHeight - rect.bottom - gap - 16, window.innerHeight * 0.72)}px`,
    zIndex: 130,
  };
}

export function MobileProfileMenu({
  open,
  onClose,
  anchorEl,
  isConnected,
  isHelperNav,
}: Props) {
  const { t, language, setLanguage } = useLanguage();
  const { signOut, isConfigured, session, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [panelStyle, setPanelStyle] = useState<PanelPosition>({});

  useLayoutEffect(() => {
    if (!open || !anchorEl) return;
    const updatePosition = () => {
      if (!anchorEl) return;
      setPanelStyle(computePanelPosition(anchorEl));
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, anchorEl]);

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
    onClose();
    redirectToLoginAfterSignOut();
  };

  const go = (path: string) => {
    onClose();
    navigate(path);
  };

  const goFavorites = () => {
    onClose();
    navigate(ROUTES.clientDashboard, { state: { tab: 'saved' } });
  };

  if (!open || !anchorEl) return null;

  const opensAbove = anchorEl.getBoundingClientRect().top > window.innerHeight * 0.55;

  return createPortal(
    <div className="fixed inset-0 z-[120] md:hidden" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/35 backdrop-blur-[2px]"
        aria-label={t('common.close')}
        onClick={onClose}
      />
      <div
        style={panelStyle}
        className={`flex flex-col overflow-hidden rounded-3xl border border-[rgba(37,99,255,0.12)] bg-white shadow-[0_20px_60px_rgba(15,23,42,0.16)] ${
          opensAbove ? 'animate-in slide-in-from-bottom-3 fade-in duration-200' : 'animate-in slide-in-from-top-2 fade-in duration-200'
        }`}
        role="menu"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
          <p className="text-sm font-black text-[#0F172A]">{t('mobile_nav.profile_menu')}</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
            aria-label={t('common.close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1">
          {isConnected ? (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={() => go(isHelperNav ? ROUTES.helperDashboard : ROUTES.clientDashboard)}
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
                  onClick={() => go(ROUTES.helperLinkCredits)}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  <Package className="h-4 w-4 text-slate-400" />
                  Pacotes
                </button>
              ) : null}
              {isHelperNav ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => go(ROUTES.profile)}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  <User className="h-4 w-4 text-slate-400" />
                  {t('nav.profile_menu_profile')}
                </button>
              ) : (
                <Link
                  to={ROUTES.profile}
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
              <button
                type="button"
                role="menuitem"
                onClick={() => go(ROUTES.settings)}
                className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                <Settings className="h-4 w-4 text-slate-400" />
                Configurações
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
                      className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${
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
