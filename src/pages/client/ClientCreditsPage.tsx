import { useEffect, useState, type ReactNode } from 'react';
import * as Icons from 'lucide-react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
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
import { LinkCreditsCompactBalanceCard } from '@/components/credits/LinkCreditsCompactBalanceCard';
import { LinkCreditsCompactStatTile } from '@/components/credits/LinkCreditsCompactStatTile';
import { ROUTES } from '@/utils/constants';
import { CLIENT_LINKCREDITS_ENABLED } from '@/config/clientLinkCredits';
import { LINK_CREDIT_PACKAGES, getLinkCreditPackage } from '@/config/linkCreditPackages';
import { startClientLinkCreditCheckout } from '@/services/clientLinkCreditsCheckout';
import {
  fetchClientCreditLedger,
  startOfCurrentMonthIso,
} from '@/services/supabase/clientCreditLedgerRemote';
import type { ClientCreditLedgerEntry } from '@/types/clientCredits';
import { computeClientCreditMetrics } from '@/utils/clientCreditMetrics';
import { coerceLegacyLinkCreditsDisplay } from '@/utils/formatLinkCredits';
import { writePendingLinkCreditPurchase } from '@/utils/pendingLinkCreditPurchase';
import { writeAccountHomeSnapshot } from '@/utils/accountSessionSnapshot';

const linkCreditGlowClass = 'text-amber-300 drop-shadow-[0_0_14px_rgba(251,191,36,0.55)]';
const PREVIEW_LIMIT = 3;

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

export default function ClientCreditsPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cancelled = searchParams.get('cancelled') === 'true';
  const legacyHistoryQuery = searchParams.get('history') === '1';
  const { showToast } = useToast();
  const { profile, authLoading, refreshProfile, session } = useAuth();
  const [buyBusy, setBuyBusy] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const [recentEntries, setRecentEntries] = useState<ClientCreditLedgerEntry[]>([]);
  const [monthEntries, setMonthEntries] = useState<ClientCreditLedgerEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<ClientCreditLedgerEntry | null>(null);
  const [activityDetailOpen, setActivityDetailOpen] = useState(false);

  // Prefer live profile credits; avoid flashing 0 while auth is still loading.
  const balance =
    typeof profile?.credits === 'number' ? coerceLegacyLinkCreditsDisplay(profile.credits) : null;
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
          fetchClientCreditLedger({ limit: 100 }),
          fetchClientCreditLedger({ since: monthStart, limit: 500 }),
        ]);
        if (!cancelledEffect) {
          setRecentEntries(recent);
          setMonthEntries(month);
          const uid = session?.user?.id ?? profile?.id;
          if (uid && typeof profile?.credits === 'number') {
            writeAccountHomeSnapshot({
              userId: uid,
              role: 'client',
              displayName: profile.name,
              avatarUrl: profile.avatar_url,
              lcBalanceVisual: coerceLegacyLinkCreditsDisplay(profile.credits),
            });
          }
        }
      } finally {
        if (!cancelledEffect) setLedgerLoading(false);
      }
    };

    void load();
    return () => {
      cancelledEffect = true;
    };
  }, [refreshProfile, session?.user?.id, profile?.id, profile?.credits, profile?.name, profile?.avatar_url]);

  const openHistory = () => {
    navigate(ROUTES.clientCreditsHistory);
  };

  const handleBuyPackage = async (packageId: string, priceId: string) => {
    if (buyBusy) return;

    if (!CLIENT_LINKCREDITS_ENABLED) {
      showToast(t('client_credits.purchase_coming_soon'), 'info');
      return;
    }

    const pkg = getLinkCreditPackage(packageId);
    setCheckoutError(null);
    setBuyBusy(packageId);
    try {
      if (pkg) {
        writePendingLinkCreditPurchase({
          credits: pkg.credits,
          role: 'client',
          packageId: pkg.id,
        });
      }
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

  const sortedEntries = [...recentEntries].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  // Legacy deep-link compat: /client/credits?history=1 → dedicated history route.
  if (legacyHistoryQuery) {
    return <Navigate to={ROUTES.clientCreditsHistory} replace />;
  }

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

        <div className="mx-auto mb-5 max-w-2xl px-5 text-center md:px-0">
          <p
            className={`inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.28em] ${linkCreditGlowClass}`}
          >
            <Icons.Sparkles className="h-3.5 w-3.5" />
            {t('link_credits_store.brand_eyebrow')}
            <Icons.Sparkles className="h-3.5 w-3.5" />
          </p>
          <h1 className="mt-2 text-3xl font-black leading-[1.05] tracking-tight text-black sm:text-4xl">
            {highlightLinkCreditText(t('client_credits.store_title'))}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm font-medium leading-relaxed text-slate-600 sm:text-base">
            {highlightLinkCreditText(t('client_credits.store_subtitle'))}
          </p>
        </div>

        <div className="mx-auto mb-5 max-w-2xl px-5 md:px-0">
          <LinkCreditsCompactBalanceCard
            title={t('credits.linkcredits_brand')}
            balance={balance}
            loading={authLoading && balance == null}
            lcUnit={lcUnit}
            buyLabel={t('client_credits.buy_cta')}
            historyLabel={t('client_credits.view_history')}
            onBuy={() => {
              if (!CLIENT_LINKCREDITS_ENABLED) {
                showToast(t('client_credits.purchase_coming_soon'), 'info');
                return;
              }
              document.getElementById('lh-client-packages')?.scrollIntoView({ behavior: 'smooth' });
            }}
            onHistory={openHistory}
            buyDisabled={buyBusy != null}
          />
        </div>

        {cancelled ? (
          <div className="mx-5 mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 md:mx-auto md:max-w-2xl">
            {t('client_credits.checkout_cancelled')}
          </div>
        ) : null}

        {checkoutError ? (
          <div className="mx-5 mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800 md:mx-auto md:max-w-2xl">
            {checkoutError}
          </div>
        ) : null}

        <div className="mx-5 mb-5 flex max-w-2xl items-center gap-3 rounded-[1.15rem] border border-blue-600/10 bg-[#F7FAFF]/95 px-3.5 py-3 text-sm font-bold leading-relaxed text-blue-950 shadow-[0_12px_30px_rgba(37,99,255,0.05)] md:mx-auto">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#245BFF] text-white shadow-[0_8px_18px_rgba(36,91,255,0.22)]">
            <Icons.Info className="h-4 w-4" />
          </span>
          <p>{t('client_credits.publish_cost_hint')}</p>
        </div>

        <section className="mx-auto mb-5 max-w-3xl px-5 md:px-0">
          <div className="rounded-[1.2rem] border border-white/80 bg-white/80 p-3.5 shadow-[0_10px_28px_rgba(15,23,42,0.06)] backdrop-blur-sm sm:p-4">
            <h2 className="text-[11px] font-black uppercase tracking-wide text-slate-500">
              {t('client_credits.your_credits')}
            </h2>
            <div className="mt-2.5 grid grid-cols-3 gap-2">
              <LinkCreditsCompactStatTile
                icon={Icons.Coins}
                label={t('client_credits.used_this_month')}
                value={ledgerLoading ? '…' : `${metrics.usedThisMonth} ${lcUnit}`}
                iconColor="text-blue-600"
                iconBg="bg-blue-100"
              />
              <LinkCreditsCompactStatTile
                icon={Icons.FileText}
                label={t('client_credits.requests_published')}
                value={ledgerLoading ? '…' : String(metrics.requestsPublishedThisMonth)}
                iconColor="text-indigo-600"
                iconBg="bg-indigo-100"
              />
              <LinkCreditsCompactStatTile
                icon={Icons.RefreshCw}
                label={t('client_credits.credits_returned')}
                value={ledgerLoading ? '…' : `${metrics.creditsReturned} ${lcUnit}`}
                iconColor="text-emerald-600"
                iconBg="bg-emerald-100"
              />
            </div>
          </div>
        </section>

        <div id="lh-client-packages" className="scroll-mt-24">
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
            </div>
          )}
        </div>

        <div className="mx-auto mt-6 max-w-3xl px-5 md:px-0">
          <LinkCreditStoreTrustSection items={trustItems} />
        </div>

        <section className="mx-auto mt-6 max-w-3xl space-y-3 px-5 md:px-0">
          <div className="rounded-[1.2rem] border border-white/80 bg-white/85 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)] backdrop-blur-sm sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-base font-black tracking-tight text-slate-950">
                {t('client_credits.recent_activity')}
              </h2>
              <button
                type="button"
                onClick={openHistory}
                className="text-xs font-black text-blue-600 hover:text-blue-700"
              >
                {t('client_credits.see_all')} →
              </button>
            </div>

            {ledgerLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm font-semibold text-slate-500">
                <Icons.Loader2 className="h-4 w-4 animate-spin" />
                …
              </div>
            ) : (
              <ClientCreditHistoryList
                entries={sortedEntries}
                limit={PREVIEW_LIMIT}
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
