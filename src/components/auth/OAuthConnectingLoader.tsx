import { useLanguage } from '@/context/LanguageContext';

/** Shown on /auth/callback while Google OAuth session is resolved. */
export function OAuthConnectingLoader() {
  const { t } = useLanguage();

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 px-6 bg-gradient-to-b from-slate-50 to-white">
      <div className="w-12 h-12 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      <p className="text-base font-bold text-slate-800 text-center">{t('auth.google_connecting')}</p>
      <p className="text-sm text-slate-500 text-center max-w-sm">{t('auth.google_connecting_hint')}</p>
    </div>
  );
}
