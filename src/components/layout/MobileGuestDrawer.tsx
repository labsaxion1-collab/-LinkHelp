import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { LogIn, Mail, Sparkles, UserPlus, X, Globe } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { ROUTES } from '@/utils/constants';
import type { AppLanguage } from '@/services/translationService';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function MobileGuestDrawer({ open, onClose }: Props) {
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const go = (path: string) => {
    onClose();
    navigate(path);
  };

  const setLang = (lang: AppLanguage) => {
    setLanguage(lang);
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[120]" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px] animate-in fade-in duration-200"
        aria-label={t('common.close')}
        onClick={onClose}
      />
      <aside
        className="absolute right-0 top-0 flex h-full w-[min(88vw,320px)] flex-col bg-white shadow-[-16px_0_48px_rgba(15,23,42,0.16)] animate-in slide-in-from-right duration-300 md:w-[min(24rem,92vw)]"
        role="dialog"
        aria-modal="true"
        aria-label={t('mobile_nav.guest_menu')}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2563FF]">Link Help</p>
            <p className="text-base font-black text-[#0F172A]">{t('mobile_nav.guest_menu')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
            aria-label={t('common.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          <button
            type="button"
            onClick={() => go(ROUTES.howItWorks)}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-sm font-bold text-slate-800 transition hover:bg-slate-50"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF2FF] text-[#2563FF]">
              <Sparkles className="h-5 w-5" />
            </span>
            {t('nav.how_it_works')}
          </button>
          <button
            type="button"
            onClick={() => go(ROUTES.contact)}
            className="mt-2 flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-sm font-bold text-slate-800 transition hover:bg-slate-50"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <Mail className="h-5 w-5" />
            </span>
            {t('nav.contact')}
          </button>

          <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
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
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </nav>

        <div className="shrink-0 space-y-2 border-t border-slate-100 px-4 py-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
          <button
            type="button"
            onClick={() => go(ROUTES.login)}
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-bold text-slate-800 transition hover:bg-slate-50"
          >
            <LogIn className="h-4 w-4" />
            {t('nav.login')}
          </button>
          <button
            type="button"
            onClick={() => go(ROUTES.signup)}
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#1677FF] via-[#1B8FFF] to-[#00D4FF] px-5 text-sm font-bold text-white shadow-[0_14px_32px_rgba(37,99,255,0.28)] transition hover:brightness-110"
          >
            <UserPlus className="h-4 w-4" />
            {t('nav.signup')}
          </button>
        </div>
      </aside>
    </div>,
    document.body,
  );
}
