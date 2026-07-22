import { ExternalLink } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { APP_MARKETING_URLS } from '@/utils/marketingNav';

/** Full-screen migration for legacy PWA opened on www / apex (no app chrome). */
export function LegacyPwaMigrationPage() {
  const { t } = useLanguage();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#050816] px-5 py-10 text-center text-white">
      <div className="mx-auto w-full max-w-md rounded-[1.75rem] border border-white/12 bg-white/[0.06] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#33B6FF]">Link Help</p>
        <h1 className="mt-4 text-2xl font-extrabold leading-tight sm:text-3xl">
          {t('legacy_pwa_migration.title')}
        </h1>
        <p className="mt-4 text-base font-medium leading-7 text-[#C7D2FE]/85">
          {t('legacy_pwa_migration.body')}
        </p>
        <a
          href={APP_MARKETING_URLS.open}
          className="lh-nav-cta mt-8 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#1677FF] to-[#00D4FF] px-6 text-base font-extrabold text-white transition hover:brightness-110"
        >
          {t('legacy_pwa_migration.cta')}
          <ExternalLink className="h-5 w-5 shrink-0" aria-hidden />
        </a>
        <p className="mt-6 text-sm leading-relaxed text-[#C7D2FE]/65">{t('legacy_pwa_migration.hint')}</p>
      </div>
    </div>
  );
}
