import { useCallback, useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { isAppShellPath } from '@/utils/navigation';
import { ROUTES } from '@/utils/constants';

const STORAGE_KEY = 'linkhelp_push_prompt_dismissed';

export function PushNotificationPrompt() {
  const { t } = useLanguage();
  const { pathname } = useLocation();
  const { session } = useAuth();
  const { supported, permission, subscribing, enablePush } = usePushNotifications();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!session?.user?.id || !isAppShellPath(pathname) || pathname === ROUTES.messages) {
      setVisible(false);
      return;
    }
    if (!supported || permission === 'loading' || permission === 'granted' || permission === 'denied') {
      setVisible(false);
      return;
    }
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') return;
    } catch {
      /* ignore */
    }
    setVisible(true);
  }, [session?.user?.id, pathname, supported, permission]);

  const dismiss = useCallback(() => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
  }, []);

  const onEnable = useCallback(async () => {
    await enablePush();
    dismiss();
  }, [dismiss, enablePush]);

  if (!visible) return null;

  return (
    <div className="md:hidden fixed bottom-[calc(8.5rem+max(env(safe-area-inset-bottom),0.5rem))] left-3 right-3 z-[41] animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="rounded-2xl border border-amber-100 bg-white shadow-lg shadow-slate-900/10 p-3 flex gap-3 items-start">
        <div className="p-2 rounded-xl bg-amber-50 text-amber-600 shrink-0">
          <Bell className="w-5 h-5" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 leading-snug">{t('push_notifications.title')}</p>
          <p className="text-xs text-gray-600 mt-1 leading-relaxed">{t('push_notifications.body')}</p>
          <button
            type="button"
            disabled={subscribing}
            onClick={() => void onEnable()}
            className="mt-2 w-full min-h-[44px] rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 disabled:opacity-60"
          >
            {subscribing ? t('common.loading') : t('push_notifications.enable')}
          </button>
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
