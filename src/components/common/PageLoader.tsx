import { useLanguage } from '@/context/LanguageContext';

/** Lightweight route transition loader for React.Suspense */
export function PageLoader() {
  const { t } = useLanguage();

  return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 text-gray-500">
      <div className="w-10 h-10 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      <p className="text-sm font-semibold">{t('common.loading')}</p>
    </div>
  );
}
