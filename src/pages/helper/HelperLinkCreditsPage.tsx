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
    <AppPageShell wide className="min-w-0 overflow-x-hidden pb-24 md:pb-8">
      <div className="mx-auto max-w-lg md:max-w-3xl">
        <HelperDashboardNav activeTab="match" onSelectFeedTab={() => {}} t={t} />

        <div className="mb-6 text-center md:text-left">
          <p className={`text-xs font-black uppercase tracking-[0.2em] ${linkCreditGlowClass}`}>
            LinkCredits
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
            {highlightLinkCreditText(t('link_credits_store.title'))}
          </h1>
          <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
            {highlightLinkCreditText(t('link_credits_store.subtitle'))}
          </p>
          <p className="mt-1 text-sm font-bold text-slate-500">{t('link_credits_store.no_subscription')}</p>
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

        <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50/80 px-4 py-4 text-sm leading-relaxed text-blue-950">
          <p>{t('link_credits_store.interest_cost_hint')}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {LINK_CREDIT_PACKAGES.map((pkg) => (
            <article
              key={pkg.id}
              className="relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5"
            >
              {pkg.badge ? (
                <span className="absolute right-4 top-4 rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white">
                  {pkg.badge}
                </span>
              ) : null}
              <h2 className={`text-lg font-black ${packageTitleClass(pkg.id)}`}>{pkg.label}</h2>
              <p className="mt-3 flex items-center gap-2 text-4xl font-black tabular-nums text-amber-300 drop-shadow-[0_0_18px_rgba(251,191,36,0.42)]">
                {pkg.credits}
                <img
                  src="/brand/linkcredit-coin-icon.png"
                  alt="LinkCredit"
                  className="h-8 w-8 rounded-full object-cover drop-shadow-[0_0_12px_rgba(251,191,36,0.35)]"
                  loading="lazy"
                  decoding="async"
                />
              </p>
              <p className="mt-2 text-xl font-black text-blue-700">
                {pkg.currency} ${pkg.price.toFixed(2)}
              </p>
              {pkg.id === 'power' ? (
                <div className="mt-4 overflow-hidden rounded-[1.25rem] border border-amber-200/70 bg-amber-50 shadow-[0_18px_34px_rgba(180,83,9,0.14)]">
                  <img
                    src="/brand/linkcredit-power-stack.jpg"
                    alt="Pacote Power LinkCredit"
                    className="h-36 w-full object-cover object-center"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              ) : null}
              <button
                type="button"
                disabled={busyId != null}
                onClick={() => void handleBuy(pkg.id, pkg.priceId)}
                className="mt-5 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-black text-white hover:bg-black disabled:opacity-60"
              >
                {busyId === pkg.id ? (
                  <Icons.Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Icons.CreditCard className="h-4 w-4" />
                )}
                {t('link_credits_store.buy_now')}
              </button>
            </article>
          ))}
        </div>
      </div>
    </AppPageShell>
  );
}
