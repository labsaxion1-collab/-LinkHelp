import { useEffect, useState, type ElementType } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { clsx } from 'clsx';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ClientCreditHistoryList } from '@/components/client/ClientCreditHistoryList';
import { ClientCreditActivityDetailModal } from '@/components/client/ClientCreditActivityDetailModal';
import { ROUTES } from '@/utils/constants';
import {
  fetchClientCreditLedger,
  startOfCurrentMonthIso,
} from '@/services/supabase/clientCreditLedgerRemote';
import type { ClientCreditLedgerEntry } from '@/types/clientCredits';
import { computeClientCreditMetrics } from '@/utils/clientCreditMetrics';
import { coerceLegacyLinkCreditsDisplay, formatLinkCredits } from '@/utils/formatLinkCredits';
import { BRAND } from '@/utils/brandAssets';

function DashboardCreditStatTile({
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
    <div className="flex flex-col items-center gap-3 rounded-[1.35rem] border border-slate-200/90 bg-white px-4 py-5 text-center shadow-[0_10px_28px_rgba(15,23,42,0.06)] ring-1 ring-slate-100/80 transition hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(37,99,255,0.10)]">
      <span
        className={clsx(
          'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm',
          iconBg,
        )}
      >
        <Icon className={clsx('h-6 w-6', iconColor)} />
      </span>
      <p className="text-[10px] font-bold uppercase tracking-wide leading-tight text-slate-500">
        {label}
      </p>
      <p className="text-2xl font-black tabular-nums leading-none text-slate-950 sm:text-3xl">
        {value}
      </p>
    </div>
  );
}

export function ClientDashboardLinkCreditsPanel() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { profile, authLoading, refreshProfile } = useAuth();
  const { showToast } = useToast();
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

  const goToCredits = () => navigate(ROUTES.clientCredits);

  return (
    <section className="space-y-4">
      {/* 1 — Card principal LinkCredits */}
      <div className="rounded-[1.65rem] border border-blue-100/90 bg-gradient-to-br from-white via-blue-50/40 to-indigo-50/30 p-5 shadow-[0_16px_40px_rgba(37,99,255,0.10)] ring-1 ring-slate-100/80 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-[0_8px_22px_rgba(37,99,255,0.14)] ring-1 ring-blue-100/80">
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
              <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                {t('client_credits.dashboard_title')}
              </h2>
              <p className="mt-3 text-4xl font-black tabular-nums leading-none text-slate-950 sm:text-5xl">
                {balanceDisplay}
              </p>
              <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600">
                {t('client_linkcredits.after_promo')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={goToCredits}
            className="inline-flex min-h-[48px] w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#3B82F6_0%,#2563FF_45%,#1D4ED8_100%)] px-5 text-sm font-black text-white shadow-[0_14px_32px_rgba(37,99,255,0.35)] ring-1 ring-blue-400/20 transition hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(37,99,255,0.42)] active:scale-[0.98] sm:w-auto sm:min-w-[11rem]"
          >
            <Icons.CreditCard className="h-4 w-4 shrink-0" />
            {t('client_credits.buy_cta')}
          </button>
        </div>
      </div>

      {/* 2–5 — Indicadores */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <DashboardCreditStatTile
          icon={Icons.Wallet}
          label={t('client_credits.current_balance')}
          value={authLoading ? '…' : `${balanceAmount} ${lcUnit}`}
          iconColor="text-blue-600"
          iconBg="bg-blue-100"
        />
        <DashboardCreditStatTile
          icon={Icons.Coins}
          label={t('client_credits.used_this_month')}
          value={ledgerLoading ? '…' : `${metrics.usedThisMonth} ${lcUnit}`}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-100"
        />
        <DashboardCreditStatTile
          icon={Icons.FileText}
          label={t('client_credits.requests_published')}
          value={ledgerLoading ? '…' : String(metrics.requestsPublishedThisMonth)}
          iconColor="text-violet-600"
          iconBg="bg-violet-100"
        />
        <DashboardCreditStatTile
          icon={Icons.RefreshCw}
          label={t('client_credits.credits_returned')}
          value={ledgerLoading ? '…' : `${metrics.creditsReturned} ${lcUnit}`}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-100"
        />
      </div>

      {/* 6 — Atividade recente */}
      <div className="rounded-[1.55rem] border border-slate-200/90 bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.05)] ring-1 ring-slate-100/80 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-black tracking-tight text-slate-950">
            {t('client_credits.recent_activity')}
          </h3>
          <button
            type="button"
            onClick={goToCredits}
            className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-blue-600 transition-colors hover:text-blue-700"
          >
            {t('client_credits.view_history')}
            <span aria-hidden>→</span>
          </button>
        </div>

        {ledgerLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm font-semibold text-slate-500">
            <Icons.Loader2 className="h-4 w-4 animate-spin" />
            …
          </div>
        ) : (
          <ClientCreditHistoryList
            entries={recentEntries}
            limit={5}
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

      <ClientCreditActivityDetailModal
        entry={selectedEntry}
        open={activityDetailOpen}
        onClose={() => {
          setActivityDetailOpen(false);
          setSelectedEntry(null);
        }}
        t={t}
        onRequestNotFound={() => showToast(t('client_credits.request_not_found'), 'error')}
      />
    </section>
  );
}
