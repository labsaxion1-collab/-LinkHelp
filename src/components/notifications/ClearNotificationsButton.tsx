import { useState } from 'react';
import * as Icons from 'lucide-react';
import { useAppData } from '@/context/AppDataContext';
import { useLanguage } from '@/context/LanguageContext';

type Props = {
  userId: string;
  variant?: 'page' | 'dropdown';
  onCleared?: () => void;
};

export function ClearNotificationsButton({ userId, variant = 'page', onCleared }: Props) {
  const { t } = useLanguage();
  const { clearAllNotifications } = useAppData();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const confirmClear = async () => {
    setBusy(true);
    try {
      await clearAllNotifications(userId);
      setOpen(false);
      onCleared?.();
    } finally {
      setBusy(false);
    }
  };

  const buttonClass =
    variant === 'page'
      ? 'inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm transition-colors hover:bg-gray-50'
      : 'text-xs font-bold text-gray-600 transition-colors hover:text-red-600';

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClass}>
        {variant === 'page' ? <Icons.Trash2 className="h-4 w-4" /> : null}
        {t('notifications.clear_all')}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-gray-900/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-notifications-title"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="clear-notifications-title" className="text-lg font-black text-gray-900">
              {t('notifications.clear_confirm_title')}
            </h2>
            <p className="mt-2 text-sm font-medium leading-relaxed text-gray-600">
              {t('notifications.clear_confirm_body')}
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={busy}
                onClick={() => setOpen(false)}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void confirmClear()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {busy ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : null}
                {t('notifications.clear_confirm_delete')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
