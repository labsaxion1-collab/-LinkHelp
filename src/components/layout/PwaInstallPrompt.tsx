import { useCallback, useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { isAppShellPath } from '@/utils/navigation';
import { ROUTES } from '@/utils/constants';
import { isPwaStandalone } from '@/utils/pwaRuntime';

const STORAGE_KEY = 'linkhelp_pwa_install_dismissed';

/** Chrome/Edge install banner + iOS “Add to Home Screen” hint */
export function PwaInstallPrompt() {
  const { t } = useLanguage();
  const { pathname } = useLocation();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (pathname === ROUTES.messages) setVisible(false);
  }, [pathname]);

  useEffect(() => {
    if (pathname === ROUTES.messages) return;

    if (!isAppShellPath(pathname)) return;
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') return;
    } catch {
      /* ignore */
    }

    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isPwaStandalone()) return;

    if (isIos) {
      setIosHint(true);
      setVisible(true);
      return;
    }

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onBip);
    return () => window.removeEventListener('beforeinstallprompt', onBip);
  }, [pathname]);

  const dismiss = useCallback(() => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    dismiss();
    setDeferred(null);
  }, [deferred, dismiss]);

  if (!visible || pathname === ROUTES.messages) return null;

  return (
    <div className="md:hidden fixed bottom-[calc(4.5rem+max(env(safe-area-inset-bottom),0.5rem))] left-3 right-3 z-[42] animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="rounded-2xl border border-primary-100 bg-white shadow-lg shadow-slate-900/10 p-3 flex gap-3 items-start">
        <div className="p-2 rounded-xl bg-primary-50 text-primary-600 shrink-0">
          <Download className="w-5 h-5" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 leading-snug">{t('pwa_install.title')}</p>
          <p className="text-xs text-gray-600 mt-1 leading-relaxed">
            {iosHint ? t('pwa_install.body_ios') : t('pwa_install.body_chrome')}
          </p>
          {!iosHint && deferred ? (
            <button
              type="button"
              onClick={() => void install()}
              className="mt-2 w-full min-h-[44px] rounded-xl bg-primary-600 text-white text-sm font-bold hover:bg-primary-700"
            >
              {t('pwa_install.cta')}
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label={t('common.close')}
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
