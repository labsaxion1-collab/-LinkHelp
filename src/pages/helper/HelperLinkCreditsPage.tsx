import { useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { HelperDashboardNav } from '@/components/helpers/HelperDashboardNav';
import { AppPageShell } from '@/components/design-system/AppPageShell';
import { LINK_CREDIT_PACKAGES } from '@/config/linkCreditPackages';
import { startLinkCreditCheckout } from '@/services/paymentService';
import { ROUTES } from '@/utils/constants';
import { Navigate } from 'react-router-dom';

const linkCreditGlowClass = 'text-amber-300 drop-shadow-[0_0_14px_rgba(251,191,36,0.55)]';

function highlightLinkCreditText(text: string): ReactNode {
  return text.split(/(LinkCredits?)/g).map((part, index) =>
    /^LinkCredits?$/.test(part) ? (
      <span key={`${part}-${index}`} className={linkCreditGlowClass}>
        {part}
      </span>
    ) : (
      part
    ),
  );
}

function packageTitleClass(packageId: string): string {
  const titleBase = 'bg-clip-text text-transparent drop-shadow-[0_0_14px_rgba(37,99,255,0.18)]';

  switch (packageId) {
    case 'starter':
      return `${titleBase} bg-gradient-to-r from-sky-500 via-blue-600 to-cyan-400`;
    case 'popular':
      return `${titleBase} bg-gradient-to-r from-emerald-500 via-green-600 to-lime-400 drop-shadow-[0_0_14px_rgba(34,197,94,0.22)]`;
    case 'pro':
      return `${titleBase} bg-gradient-to-r from-violet-500 via-purple-600 to-fuchsia-500 drop-shadow-[0_0_14px_rgba(168,85,247,0.24)]`;
    case 'power':
      return `${titleBase} bg-gradient-to-r from-rose-500 via-red-600 to-orange-500 drop-shadow-[0_0_14px_rgba(239,68,68,0.24)]`;
    default:
      return 'text-slate-950';
  }
}

function packageArtwork(packageId: string): string | null {
  switch (packageId) {
    case 'starter':
      return '/brand/linkcredit-coin-icon.png';
    case 'popular':
      return '/brand/linkcredit-popular-stack.jpg';
    case 'pro':
      return '/brand/linkcredit-pro-stack.jpg';
    case 'power':
      return '/brand/linkcredit-power-stack.jpg';
    default:
      return null;
  }
}

function packageAccent(packageId: string): string {
  switch (packageId) {
    case 'starter':
      return 'from-blue-500/14 via-sky-400/5 to-transparent';
    case 'popular':
      return 'from-emerald-500/14 via-green-400/5 to-transparent';
    case 'pro':
      return 'from-violet-500/14 via-fuchsia-400/5 to-transparent';
    case 'power':
      return 'from-rose-500/14 via-red-400/5 to-transparent';
    default:
      return 'from-slate-500/10 to-transparent';
  }
}

export default function HelperLinkCreditsPage() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const cancelled = searchParams.get('cancelled') === 'true';
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (profile?.role !== 'helper') {
    return <Navigate to={ROUTES.clientDashboard} replace />;
  }

  const handleBuy = async (packageId: string, priceId: string) => {
    setError(null);
    setBusyId(packageId);
    try {
      const { url } = await startLinkCreditCheckout({ packageId, priceId });
      window.location.href = url;
    } catch (e) {
      console.error('[LinkCredits checkout]', e);
      setError(e instanceof Error ? e.message : t('link_credits_store.checkout_error'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AppPageShell wide className="relative min-w-0 overflow-x-hidden bg-[#F8F5EE] bg-[url('/brand/linkcredits-store-background.jpg')] bg-cover bg-fixed bg-center px-5 pb-28 pt-5 md:px-7 md:pb-10">
      <div className="pointer-events-none absolute inset-0 bg-white/58 backdrop-blur-[1px]" />
      <div className="pointer-events-none absolute -left-24 top-36 h-64 w-64 rounded-full bg-blue-200/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-[32rem] h-72 w-72 rounded-full bg-amber-200/20 blur-3xl" />

      <div className="relative mx-auto max-w-5xl">
        <HelperDashboardNav activeTab="match" onSelectFeedTab={() => {}} t={t} />

        <div className="mx-auto mb-7 max-w-2xl text-center">
          <p className={`inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.28em] ${linkCreditGlowClass}`}>
            <Icons.Sparkles className="h-3.5 w-3.5" />
            LINKCREDITS
            <Icons.Sparkles className="h-3.5 w-3.5" />
          </p>
          <h1 className="mt-3 text-4xl font-black leading-[1.02] tracking-tight text-black sm:text-5xl">
            {highlightLinkCreditText(t('link_credits_store.title'))}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base font-medium leading-relaxed text-slate-600 sm:text-[17px]">
            {highlightLinkCreditText(t('link_credits_store.subtitle'))}
            <span className="mt-1 block font-semibold text-slate-500">{t('link_credits_store.no_subscription')}</span>
          </p>
        </div>

        {cancelled ? (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
            {t('link_credits_store.cancelled_banner')}
          </div>
        ) : null}

        {error ? (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
            {error}
          </div>
        ) : null}

        <div className="mx-auto mb-7 flex max-w-2xl items-center gap-3 rounded-[1.15rem] border border-blue-600/10 bg-[#F7FAFF]/95 px-4 py-4 text-sm font-bold leading-relaxed text-blue-950 shadow-[0_12px_30px_rgba(37,99,255,0.05)]">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#245BFF] text-white shadow-[0_8px_18px_rgba(36,91,255,0.22)]">
            <Icons.Info className="h-5 w-5" />
          </span>
          <p>{t('link_credits_store.interest_cost_hint')}</p>
        </div>

        <div className="mx-auto grid max-w-3xl gap-5">
          {LINK_CREDIT_PACKAGES.map((pkg) => {
            const artwork = packageArtwork(pkg.id);

            return (
              <article
                key={pkg.id}
                className="group relative min-h-[13rem] overflow-hidden rounded-[1.35rem] border border-white/85 bg-white/88 p-5 shadow-[0_14px_38px_rgba(92,67,16,0.10)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_48px_rgba(92,67,16,0.15)] sm:min-h-[14rem] sm:p-6"
              >
                <div className={`pointer-events-none absolute inset-0 bg-gradient-to-r ${packageAccent(pkg.id)} opacity-80`} />
                <div className="pointer-events-none absolute right-[22%] top-1/2 h-24 w-24 -translate-y-1/2 rounded-full bg-amber-300/10 blur-2xl transition group-hover:bg-amber-300/20" />
                {pkg.badge ? (
                  <span className="absolute left-5 top-5 z-10 translate-x-[5.5rem] rounded-full bg-[#2563FF] px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-white shadow-[0_7px_16px_rgba(37,99,255,0.22)] sm:left-6 sm:translate-x-[6.5rem] sm:text-[10px]">
                    {pkg.badge}
                  </span>
                ) : null}

                <div className="relative grid min-h-[10.5rem] grid-cols-[minmax(0,0.88fr)_minmax(5.5rem,0.8fr)_minmax(0,1fr)] items-center gap-2.5 sm:min-h-[11rem] sm:grid-cols-[minmax(0,1fr)_minmax(8rem,0.85fr)_minmax(0,1fr)] sm:gap-6">
                  <div className="min-w-0 self-stretch">
                    <h2 className={`text-lg font-black sm:text-xl ${packageTitleClass(pkg.id)}`}>{pkg.label}</h2>
                    <p className="mt-4 whitespace-nowrap bg-gradient-to-b from-[#FFE36A] via-[#F3B51B] to-[#C98508] bg-clip-text text-5xl font-black leading-[0.86] tracking-tight text-transparent drop-shadow-[0_0_16px_rgba(217,169,40,0.28)] sm:text-7xl">
                      {pkg.credits}
                    </p>
                    <p className="mt-2 text-xs font-black text-black sm:text-base">LinkCredits</p>
                  </div>

                  {artwork ? (
                    <img
                      src={artwork}
                      alt={`Pacote ${pkg.label} LinkCredit`}
                      className="h-24 w-full object-contain object-center drop-shadow-[0_18px_22px_rgba(180,83,9,0.24)] transition duration-500 group-hover:-translate-y-1 group-hover:scale-[1.04] sm:h-36"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : null}

                  <div className="min-w-0 border-l border-slate-200/80 pl-3 sm:pl-6">
                    <p className="break-words text-base font-black leading-tight text-[#245BFF] sm:text-2xl">
                      {pkg.currency} ${pkg.price.toFixed(2)}
                    </p>
                    <button
                      type="button"
                      disabled={busyId != null}
                      onClick={() => void handleBuy(pkg.id, pkg.priceId)}
                      className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-[1rem] bg-gradient-to-r from-[#071238] to-[#02102D] px-2.5 text-[10px] font-black text-white shadow-[0_10px_22px_rgba(7,18,56,0.20)] transition hover:scale-[1.02] hover:brightness-125 disabled:opacity-60 sm:min-h-[50px] sm:gap-2 sm:px-4 sm:text-sm"
                    >
                      {busyId === pkg.id ? (
                        <Icons.Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Icons.ShoppingCart className="h-4 w-4 shrink-0" />
                      )}
                      <span>{t('link_credits_store.buy_now')}</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <section className="mx-auto mt-7 grid max-w-3xl grid-cols-3 divide-x divide-slate-100 rounded-[1.75rem] border border-black/[0.04] bg-white px-2 py-6 shadow-[0_12px_34px_rgba(15,23,42,0.05)] sm:px-5">
          {[
            { label: 'Seguro e confiável', icon: Icons.ShieldCheck },
            { label: 'Transações rápidas', icon: Icons.Zap },
            { label: 'Qualidade premium', icon: Icons.Medal },
          ].map((benefit) => {
            const Icon = benefit.icon;
            return (
              <div key={benefit.label} className="flex min-w-0 flex-col items-center px-2 text-center sm:px-5">
                <Icon className="h-7 w-7 text-[#D9A928] drop-shadow-[0_0_10px_rgba(217,169,40,0.28)] sm:h-9 sm:w-9" />
                <p className="mt-3 text-[9px] font-black uppercase leading-tight text-black sm:text-xs">{benefit.label}</p>
              </div>
            );
          })}
        </section>
      </div>
    </AppPageShell>
  );
}
