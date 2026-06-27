import { useEffect, useState } from 'react';
import * as Icons from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { AppPageShell } from '@/components/design-system/AppPageShell';
import { DesktopBackButton } from '@/components/layout/DesktopBackButton';
import { ClientCreditHistoryList } from '@/components/client/ClientCreditHistoryList';
import { ClientCreditActivityDetailModal } from '@/components/client/ClientCreditActivityDetailModal';
import { ROUTES } from '@/utils/constants';
import { CLIENT_LINKCREDITS_ENABLED } from '@/config/clientLinkCredits';
import { startClientLinkCreditCheckout } from '@/services/clientLinkCreditsCheckout';
import {
  fetchClientCreditLedger,
  startOfCurrentMonthIso,
} from '@/services/supabase/clientCreditLedgerRemote';
import type { ClientCreditLedgerEntry } from '@/types/clientCredits';
import { computeClientCreditMetrics } from '@/utils/clientCreditMetrics';
import { coerceLegacyLinkCreditsDisplay, formatLinkCredits } from '@/utils/formatLinkCredits';
import { BRAND } from '@/utils/brandAssets';

function StatTile({
  icon: Icon,
  label,
  value,
  iconColor,
  iconBg,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  iconColor: string;
  iconBg: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200/90 bg-white px-3 py-4 text-center shadow-sm">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </span>
      <p className="text-[10px] font-bold leading-tight text-slate-500">{label}</p>
      <p className="text-lg font-black tabular-nums text-slate-950">{value}</p>
    </div>
  );
}

export default function ClientCreditsPage() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { profile, authLoading, refreshProfile } = useAuth();
  const [buyBusy, setBuyBusy] = useState(false);
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const [recentEntries, setRecentEntries] = useState<ClientCreditLedgerEntry[]>([]);
  const [monthEntries, setMonthEntries] = useState<ClientCreditLedgerEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<ClientCreditLedgerEntry | null>(null);
  const [activityDetailOpen, setActivityDetailOpen] = useState(false);

  const balance = profile?.credits ?? 0;
  const balanceDisplay = authLoading ? '…' : formatLinkCredits(balance, language);
  const balanceAmount = authLoading ? 0 : coerceLegacyLinkCreditsDisplay(balance);
  const metrics = computeClientCreditMetrics(monthEntries);
  const lcUnit = t('credits.lc_unit');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLedgerLoading(true);
      try {
        await refreshProfile();
        const monthStart = startOfCurrentMonthIso();
        const [recent, month] = await Promise.all([
          fetchClientCreditLedger({ limit: 20 }),
          fetchClientCreditLedger({ since: monthStart, limit: 500 }),
        ]);
        if (!cancelled) {
          setRecentEntries(recent);
          setMonthEntries(month);
        }
      } finally {
        if (!cancelled) setLedgerLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [refreshProfile]);

  const handleBuyCredits = async () => {
    if (buyBusy) return;

    if (!CLIENT_LINKCREDITS_ENABLED) {
      showToast(t('client_credits.purchase_coming_soon'), 'info');
      return;
    }

    setBuyBusy(true);
    try {
      const { url } = await startClientLinkCreditCheckout({ packageId: 'default' });
      window.location.href = url;
    } catch {
      showToast(t('client_credits.purchase_coming_soon'), 'info');
    } finally {
      setBuyBusy(false);
    }
  };

  return (
    <AppPageShell className="min-w-0 pb-10">
      <DesktopBackButton to={ROUTES.clientDashboard} />

      <div className="mx-auto mt-4 max-w-3xl space-y-4">
        <div className="rounded-3xl border border-slate-200/90 bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/20 p-6 shadow-sm ring-1 ring-slate-100/80 sm:p-8">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-blue-100/80">
              <img
                src={BRAND.linkCreditCoin}
                alt=""
                className="h-11 w-11 rounded-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-600">
                {t('client_credits.your_credits')}
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                {t('client_credits.dashboard_title')}
              </h1>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-blue-100/90 bg-white/90 px-5 py-5 text-center shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              {t('client_credits.current_balance')}
            </p>
            <p className="mt-1 text-4xl font-black tabular-nums text-slate-950">{balanceDisplay}</p>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              {authLoading ? '…' : t('client_credits.balance', { amount: balanceAmount })}
            </p>
          </div>

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

          {!CLIENT_LINKCREDITS_ENABLED ? (
            <div className="mt-5 rounded-2xl border border-amber-200/90 bg-amber-50/80 px-4 py-4">
              <div className="flex items-start gap-3">
                <span className="inline-flex shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-900">
                  {t('client_credits.coming_soon_badge')}
                </span>
                <p className="text-sm font-medium leading-relaxed text-amber-950">
                  {t('client_credits.coming_soon')}
                </p>
              </div>
            </div>
          ) : null}

          <p className="mt-5 text-sm font-medium leading-relaxed text-slate-500">
            {t('client_linkcredits.after_promo')}
          </p>

          <button
            type="button"
            disabled={buyBusy}
            onClick={() => void handleBuyCredits()}
            className="mt-6 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition-colors hover:bg-blue-700 disabled:opacity-60"
          >
            {buyBusy ? (
              <Icons.Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            ) : (
              <Icons.ShoppingCart className="h-4 w-4 shrink-0" />
            )}
            {t('client_credits.buy_cta')}
          </button>

          <button
            type="button"
            onClick={() => navigate(ROUTES.clientDashboard)}
            className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Icons.ArrowLeft className="h-4 w-4 shrink-0" />
            {t('client_credits.back_dashboard')}
          </button>
        </div>

        <section className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
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
