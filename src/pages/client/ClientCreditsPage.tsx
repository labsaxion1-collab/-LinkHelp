import { useEffect, useState, type ElementType, type ReactNode } from 'react';
import * as Icons from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { AppPageShell } from '@/components/design-system/AppPageShell';
import { DesktopBackButton } from '@/components/layout/DesktopBackButton';
import { ClientCreditHistoryList } from '@/components/client/ClientCreditHistoryList';
import { ClientCreditActivityDetailModal } from '@/components/client/ClientCreditActivityDetailModal';
import {
  LinkCreditPackageStoreCard,
  LinkCreditStoreTrustSection,
} from '@/components/credits/LinkCreditPackageStoreCard';
import { ROUTES } from '@/utils/constants';
import { CLIENT_LINKCREDITS_ENABLED } from '@/config/clientLinkCredits';
import { LINK_CREDIT_PACKAGES } from '@/config/linkCreditPackages';
import { startClientLinkCreditCheckout } from '@/services/clientLinkCreditsCheckout';
import {
  fetchClientCreditLedger,
  startOfCurrentMonthIso,
} from '@/services/supabase/clientCreditLedgerRemote';
import type { ClientCreditLedgerEntry } from '@/types/clientCredits';
import { computeClientCreditMetrics } from '@/utils/clientCreditMetrics';
import { coerceLegacyLinkCreditsDisplay } from '@/utils/formatLinkCredits';

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

function StatTile({
  icon: Icon,
  label,
  value,
  iconColor,
  iconBg,
}: {
  icon: ElementType;
  label: string;
  value: string;
  iconColor: string;
  iconBg: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/80 bg-white/85 px-3 py-4 text-center shadow-[0_8px_24px_rgba(15,23,42,0.05)] backdrop-blur-sm">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </span>
      <p className="text-[10px] font-bold leading-tight text-slate-500">{label}</p>
      <p className="text-lg font-black tabular-nums text-slate-950">{value}</p>
    </div>
  );
}

export default function ClientCreditsPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cancelled = searchParams.get('cancelled') === 'true';
  const { showToast } = useToast();
  const { profile, authLoading, refreshProfile } = useAuth();
  const [buyBusy, setBuyBusy] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const [recentEntries, setRecentEntries] = useState<ClientCreditLedgerEntry[]>([]);
  const [monthEntries, setMonthEntries] = useState<ClientCreditLedgerEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<ClientCreditLedgerEntry | null>(null);
  const [activityDetailOpen, setActivityDetailOpen] = useState(false);

  const balance = profile?.credits ?? 0;
  const balanceAmount = authLoading ? 0 : coerceLegacyLinkCreditsDisplay(balance);
  const metrics = computeClientCreditMetrics(monthEntries);
  const lcUnit = t('credits.lc_unit');

  useEffect(() => {
    let cancelledEffect = false;

    const load = async () => {
      setLedgerLoading(true);
      try {
        await refreshProfile();
        const monthStart = startOfCurrentMonthIso();
        const [recent, month] = await Promise.all([
          fetchClientCreditLedger({ limit: 20 }),
          fetchClientCreditLedger({ since: monthStart, limit: 500 }),
        ]);
        if (!cancelledEffect) {
          setRecentEntries(recent);
          setMonthEntries(month);
        }
      } finally {
        if (!cancelledEffect) setLedgerLoading(false);
      }
    };

    void load();
    return () => {
      cancelledEffect = true;
    };
  }, [refreshProfile]);

  const handleBuyPackage = async (packageId: string, priceId: string) => {
    if (buyBusy) return;

    if (!CLIENT_LINKCREDITS_ENABLED) {
      showToast(t('client_credits.purchase_coming_soon'), 'info');
      return;
    }

    setCheckoutError(null);
    setBuyBusy(packageId);
    try {
      const { url } = await startClientLinkCreditCheckout({ packageId, priceId });
      window.location.href = url;
    } catch (e) {
      console.error('[LinkHelp] client checkout', e);
      const message = e instanceof Error ? e.message : t('client_credits.checkout_error');
      setCheckoutError(message);
      showToast(t('client_credits.checkout_error'), 'error');
    } finally {
      setBuyBusy(null);
    }
  };

  const trustItems = [
    { label: t('link_credits_store.benefit_secure'), icon: Icons.ShieldCheck },
    { label: t('link_credits_store.benefit_fast'), icon: Icons.Zap },
    { label: t('link_credits_store.benefit_premium'), icon: Icons.Medal },
  ];

  return (
    <AppPageShell
      wide
      className="relative min-w-0 overflow-x-hidden bg-[#F8F5EE] bg-[url('/brand/linkcredits-store-background.webp')] bg-cover bg-fixed bg-center px-0 pb-28 pt-5 md:px-7 md:pb-10"
    >
      <div className="pointer-events-none absolute inset-0 bg-white/58 backdrop-blur-[1px]" />
      <div className="pointer-events-none absolute -left-24 top-36 h-64 w-64 rounded-full bg-blue-200/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-[32rem] h-72 w-72 rounded-full bg-amber-200/20 blur-3xl" />

      <div className="relative mx-auto max-w-5xl">
        <div className="px-5 md:px-0">
          <DesktopBackButton to={ROUTES.clientDashboard} />
        </div>

        <div className="mx-auto mb-7 max-w-2xl px-5 text-center md:px-0">
          <p
            className={`inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.28em] ${linkCreditGlowClass}`}
          >
            <Icons.Sparkles className="h-3.5 w-3.5" />
            {t('link_credits_store.brand_eyebrow')}
            <Icons.Sparkles className="h-3.5 w-3.5" />
          </p>
          <h1 className="mt-3 text-4xl font-black leading-[1.02] tracking-tight text-black sm:text-5xl">
            {highlightLinkCreditText(t('client_credits.store_title'))}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base font-medium leading-relaxed text-slate-600 sm:text-[17px]">
            {highlightLinkCreditText(t('client_credits.store_subtitle'))}
          </p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white/90 px-4 py-2 text-sm font-bold text-slate-700 shadow-sm backdrop-blur-sm">
            <Icons.Coins className="h-4 w-4 text-[#D9A928]" />
            {authLoading ? '…' : t('client_credits.balance', { amount: balanceAmount })}
          </p>
        </div>

        {cancelled ? (
          <div className="mx-5 mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 md:mx-0">
            {t('client_credits.checkout_cancelled')}
          </div>
        ) : null}

        {checkoutError ? (
          <div className="mx-5 mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800 md:mx-0">
            {checkoutError}
          </div>
        ) : null}

        <div className="mx-5 mb-7 flex max-w-2xl items-center gap-3 rounded-[1.15rem] border border-blue-600/10 bg-[#F7FAFF]/95 px-4 py-4 text-sm font-bold leading-relaxed text-blue-950 shadow-[0_12px_30px_rgba(37,99,255,0.05)] md:mx-auto">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#245BFF] text-white shadow-[0_8px_18px_rgba(36,91,255,0.22)]">
            <Icons.Info className="h-5 w-5" />
          </span>
          <p>{t('client_credits.publish_cost_hint')}</p>
        </div>

        {CLIENT_LINKCREDITS_ENABLED ? (
          <div className="mx-auto grid max-w-3xl gap-5 px-5 md:px-0">
            {LINK_CREDIT_PACKAGES.map((pkg) => {
              const label = t(`link_credits_store.package_${pkg.id}_label`);
              const badge = pkg.badgeKey ? t(`link_credits_store.${pkg.badgeKey}`) : null;

              return (
                <LinkCreditPackageStoreCard
                  key={pkg.id}
                  pkg={pkg}
                  label={label}
                  badge={badge}
                  brandName={t('link_credits_store.brand_name')}
                  buyLabel={t('link_credits_store.buy_now')}
                  imageAlt={t('link_credits_store.package_image_alt', { label })}
                  busy={buyBusy === pkg.id}
                  disabled={buyBusy != null}
                  onBuy={() => void handleBuyPackage(pkg.id, pkg.priceId)}
                />
              );
            })}
          </div>
        ) : (
          <div className="mx-5 max-w-2xl rounded-[1.35rem] border border-amber-200/90 bg-amber-50/90 px-5 py-5 shadow-sm md:mx-auto">
            <div className="flex items-start gap-3">
              <span className="inline-flex shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-900">
                {t('client_credits.coming_soon_badge')}
              </span>
              <p className="text-sm font-medium leading-relaxed text-amber-950">
                {t('client_credits.coming_soon')}
              </p>
            </div>
            <button
              type="button"
              disabled={Boolean(buyBusy)}
              onClick={() => showToast(t('client_credits.purchase_coming_soon'), 'info')}
              className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[1rem] bg-gradient-to-r from-[#071238] to-[#02102D] px-4 text-sm font-black text-white shadow-[0_10px_22px_rgba(7,18,56,0.20)] disabled:opacity-60"
            >
              <Icons.ShoppingCart className="h-4 w-4 shrink-0" />
              {t('client_credits.buy_cta')}
            </button>
          </div>
        )}

        <div className="mx-auto mt-7 max-w-3xl px-5 md:px-0">
          <LinkCreditStoreTrustSection items={trustItems} />
        </div>

        <section className="mx-auto mt-8 max-w-3xl space-y-4 px-5 md:px-0">
          <div className="rounded-[1.35rem] border border-white/80 bg-white/80 p-5 shadow-[0_10px_28px_rgba(15,23,42,0.06)] backdrop-blur-sm sm:p-6">
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">
              {t('client_credits.your_credits')}
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatTile
                icon={Icons.Coins}
                label={t('client_credits.used_this_month')}
                value={ledgerLoading ? '…' : `${metrics.usedThisMonth} ${lcUnit}`}
                iconColor="text-blue-600"
                iconBg="bg-blue-100"
              />
              <StatTile
                icon={Icons.FileText}
                label={t('client_credits.requests_published')}
                value={ledgerLoading ? '…' : String(metrics.requestsPublishedThisMonth)}
                iconColor="text-indigo-600"
                iconBg="bg-indigo-100"
              />
              <StatTile
                icon={Icons.RefreshCw}
                label={t('client_credits.credits_returned')}
                value={ledgerLoading ? '…' : `${metrics.creditsReturned} ${lcUnit}`}
                iconColor="text-emerald-600"
                iconBg="bg-emerald-100"
              />
            </div>
            <p className="mt-4 text-center text-sm font-medium leading-relaxed text-slate-500">
              {t('client_linkcredits.after_promo')}
            </p>
          </div>

          <div className="rounded-[1.35rem] border border-white/80 bg-white/85 p-5 shadow-[0_10px_28px_rgba(15,23,42,0.06)] backdrop-blur-sm sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-black tracking-tight text-slate-950">
                {t('client_credits.recent_activity')}
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                {t('client_credits.credit_history')}
              </span>
            </div>

            {ledgerLoading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm font-semibold text-slate-500">
                <Icons.Loader2 className="h-4 w-4 animate-spin" />
                …
              </div>
            ) : (
              <ClientCreditHistoryList
                entries={recentEntries}
                limit={20}
                t={t}
                emptyLabel={t('client_credits.no_history')}
                onSelect={(entry) => {
                  if (!entry.requestId) return;
                  setSelectedEntry(entry);
                  setActivityDetailOpen(true);
                }}
              />
            )}
          </div>

          <button
            type="button"
            onClick={() => navigate(ROUTES.clientDashboard)}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[1rem] border border-slate-200/90 bg-white/90 px-4 text-sm font-bold text-slate-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-white"
          >
            <Icons.ArrowLeft className="h-4 w-4 shrink-0" />
            {t('client_credits.back_dashboard')}
          </button>
        </section>
      </div>

      <ClientCreditActivityDetailModal
        entry={selectedEntry}
        open={activityDetailOpen}
        onClose={() => {
          setActivityDetailOpen(false);
          setSelectedEntry(null);
        }}
        onRequestNotFound={() => showToast(t('client_credits.request_not_found'), 'error')}
        t={t}
      />
    </AppPageShell>
  );
}
