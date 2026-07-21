import { ShieldOff } from 'lucide-react';
import { FluxBrandMark } from '@/components/brand/FluxBrandMark';
import { useLanguage } from '@/context/LanguageContext';
import { LINKHELP_PUBLIC_ORIGIN } from '@/utils/fluxHost';

export default function FluxAccessDeniedPage() {
  const { t } = useLanguage();

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center bg-[#030508] px-4 text-center text-slate-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/4 h-64 w-64 -translate-x-1/2 rounded-full bg-red-500/10 blur-3xl" />
      </div>
      <div className="relative max-w-md">
        <FluxBrandMark showTagline className="mb-6 justify-center" />
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/30 bg-red-950/40">
          <ShieldOff className="h-7 w-7 text-red-300" />
        </div>
        <h1 className="text-xl font-black text-white">{t('flux.access_denied.title')}</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">{t('flux.access_denied.body')}</p>
        <a
          href={LINKHELP_PUBLIC_ORIGIN}
          className="mt-8 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-100"
        >
          {t('flux.access_denied.cta')}
        </a>
      </div>
    </div>
  );
}
