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
      return '/brand/linkcredit-popular-stack.png';
    case 'pro':
      return '/brand/linkcredit-pro-stack.png';
    case 'power':
      return '/brand/linkcredit-power-stack.png';
    default:
      return null;
  }
}

function packageArtworkClass(packageId: string): string {
  const base =
    'max-h-20 max-w-full object-contain object-center drop-shadow-[0_14px_18px_rgba(180,83,9,0.22)] transition duration-500 group-hover:-translate-y-0.5 sm:max-h-none sm:h-24';

  switch (packageId) {
    case 'starter':
      return `${base} w-[4.5rem] scale-[0.72] sm:w-[5.25rem] sm:scale-[0.68] sm:group-hover:scale-[0.72]`;
    case 'popular':
      return `${base} w-[7.5rem] scale-[1.02] sm:w-[9.8rem] sm:scale-[1.28] sm:group-hover:scale-[1.32]`;
    case 'pro':
      return `${base} w-[8rem] scale-[0.96] sm:w-[10.4rem] sm:scale-[1.18] sm:group-hover:scale-[1.22]`;
    case 'power':
      return `${base} w-[8.25rem] scale-[0.98] sm:w-[10.8rem] sm:scale-[1.20] sm:group-hover:scale-[1.24]`;
    default:
      return `${base} w-full group-hover:scale-[1.04]`;
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
    <AppPageShell wide className="relative min-w-0 overflow-x-hidden bg-[#F8F5EE] bg-[url('/brand/linkcredits-store-background.jpg')] bg-cover bg-fixed bg-center px-0 pb-28 pt-5 md:px-7 md:pb-10">
      <div className="pointer-events-none absolute inset-0 bg-white/58 backdrop-blur-[1px]" />
      <div className="pointer-events-none absolute -left-24 top-36 h-64 w-64 rounded-full bg-blue-200/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-[32rem] h-72 w-72 rounded-full bg-amber-200/20 blur-3xl" />

      <div className="relative mx-auto max-w-5xl">
        <HelperDashboardNav activeTab="match" onSelectFeedTab={() => {}} t={t} />

        <div className="mx-auto mb-7 max-w-2xl px-5 text-center md:px-0">
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
          <div className="mx-5 mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 md:mx-0">
            {t('link_credits_store.cancelled_banner')}
          </div>
        ) : null}

        {error ? (
          <div className="mx-5 mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800 md:mx-0">
            {error}
          </div>
        ) : null}

        <div className="mx-5 mb-7 flex max-w-2xl items-center gap-3 rounded-[1.15rem] border border-blue-600/10 bg-[#F7FAFF]/95 px-4 py-4 text-sm font-bold leading-relaxed text-blue-950 shadow-[0_12px_30px_rgba(37,99,255,0.05)] md:mx-auto">
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
                className="group relative overflow-hidden rounded-[1.35rem] border border-white/85 bg-white/88 px-4 py-4 shadow-[0_14px_38px_rgba(92,67,16,0.10)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_48px_rgba(92,67,16,0.15)] sm:px-5 sm:py-5"
              >
                <div className={`pointer-events-none absolute inset-0 bg-gradient-to-r ${packageAccent(pkg.id)} opacity-80`} />
                <div className="pointer-events-none absolute right-[22%] top-1/2 hidden h-24 w-24 -translate-y-1/2 rounded-full bg-amber-300/10 blur-2xl transition group-hover:bg-amber-300/20 sm:block" />

                <div className="relative flex flex-col gap-4 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(8.4rem,0.95fr)_minmax(0,1fr)] sm:items-center sm:gap-5">
                  <div className="relative z-10 flex min-w-0 items-end justify-between gap-3 sm:block">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className={`text-lg font-black sm:text-xl ${packageTitleClass(pkg.id)}`}>{pkg.label}</h2>
                        {pkg.badge ? (
                          <span className="rounded-full bg-[#245BFF] px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white">
                            {pkg.badge}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 whitespace-nowrap bg-gradient-to-b from-[#FFE36A] via-[#F3B51B] to-[#C98508] bg-clip-text text-[2.35rem] font-black leading-none tracking-tight text-transparent drop-shadow-[0_0_16px_rgba(217,169,40,0.28)] sm:text-6xl">
                        {pkg.credits}
                      </p>
                      <p className="mt-1.5 whitespace-nowrap text-[11px] font-black text-black sm:text-sm">LinkCredits</p>
                    </div>

                    <div className="relative z-0 flex shrink-0 items-center justify-center overflow-visible sm:hidden">
                      {artwork ? (
                        <img
                          src={artwork}
                          alt={`Pacote ${pkg.label} LinkCredit`}
                          className={packageArtworkClass(pkg.id)}
                          loading="lazy"
                          decoding="async"
                        />
                      ) : null}
                    </div>
                  </div>

                  <div className="relative z-0 hidden min-w-0 items-center justify-center overflow-visible sm:flex">
                    {artwork ? (
                      <img
                        src={artwork}
                        alt=""
                        aria-hidden
                        className={packageArtworkClass(pkg.id)}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : null}
                  </div>

                  <div className="relative z-10 min-w-0 border-t border-slate-200/80 pt-3 sm:border-l sm:border-t-0 sm:bg-white/20 sm:pl-6 sm:pt-0">
                    <p className="whitespace-nowrap text-[15px] font-black leading-tight text-[#071238] drop-shadow-[0_8px_18px_rgba(7,18,56,0.10)] sm:text-xl">
                      {pkg.currency} ${pkg.price.toFixed(2)}
                    </p>
                    <button
                      type="button"
                      disabled={busyId != null}
                      onClick={() => void handleBuy(pkg.id, pkg.priceId)}
                      className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[1rem] bg-gradient-to-r from-[#071238] to-[#02102D] px-4 text-[13px] font-black text-white shadow-[0_10px_22px_rgba(7,18,56,0.20)] transition hover:scale-[1.02] hover:brightness-125 disabled:opacity-60 sm:min-h-[50px] sm:text-sm"
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

        <section className="mx-auto mt-7 grid max-w-3xl grid-cols-1 gap-4 rounded-[1.75rem] border border-black/[0.04] bg-white px-4 py-5 shadow-[0_12px_34px_rgba(15,23,42,0.05)] sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-slate-100 sm:px-5 sm:py-6">
          {[
            { label: 'Seguro e confiável', icon: Icons.ShieldCheck },
            { label: 'Transações rápidas', icon: Icons.Zap },
            { label: 'Qualidade premium', icon: Icons.Medal },
          ].map((benefit) => {
            const Icon = benefit.icon;
            return (
              <div key={benefit.label} className="flex min-w-0 flex-col items-center px-2 text-center sm:px-5">
                <Icon className="h-7 w-7 text-[#D9A928] drop-shadow-[0_0_10px_rgba(217,169,40,0.28)] sm:h-9 sm:w-9" />
                <p className="mt-2 text-[10px] font-black uppercase leading-tight text-black sm:mt-3 sm:text-xs">{benefit.label}</p>
              </div>
            );
          })}
        </section>
      </div>
    </AppPageShell>
  );
}
