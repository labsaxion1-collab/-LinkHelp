import * as Icons from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useCredits } from '@/context/CreditContext';
import { HelperDashboardNav } from '@/components/helpers/HelperDashboardNav';
import { ROUTES } from '@/utils/constants';
import { UI_VISIBILITY } from '@/config/uiVisibility';
import { CreditsUsageDashboard } from '@/components/features/CreditsUsageDashboard';
import { CreditRefundStatusCard } from '@/components/features/CreditRefundStatusCard';
import { AppPageShell } from '@/components/design-system/AppPageShell';
import { formatLinkCredits } from '@/utils/formatLinkCredits';

export default function HelperCreditsPage() {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const { wallet, transactions, unlocks, loading } = useCredits();
  const balanceLabel = formatLinkCredits(wallet?.balance ?? 0, language);

  const helperWorkspace = profile?.role === 'helper';
  if (!helperWorkspace) {
    return <Navigate to={ROUTES.clientDashboard} replace />;
  }

  const creditsUsed = wallet?.totalSpent ?? 0;

  return (
    <AppPageShell wide className="min-w-0 overflow-x-hidden">
      <div className="mx-auto max-w-[1600px] min-w-0">
        <HelperDashboardNav
          activeTab="match"
          onSelectFeedTab={() => {}}
          t={t}
        />

        <div className="mx-auto max-w-5xl">
        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-blue-600">{t('credits.wallet_title')}</p>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">{t('helper_credits.page_title')}</h1>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-slate-500">{t('helper_credits.page_sub')}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:min-w-[280px]">
              <div className="rounded-2xl bg-blue-50 px-4 py-3 text-center">
                <p className="text-[10px] font-black uppercase tracking-wide text-blue-500">{t('helper_dashboard.credits_label')}</p>
                <p className="text-2xl font-black text-blue-950">{loading ? '…' : balanceLabel}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-3 py-3 text-center">
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{t('helper_dashboard.credits_used_month')}</p>
                <p className="text-xl font-black text-slate-900">{creditsUsed}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-3 py-3 text-center">
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{t('helper_dashboard.unlocked_count')}</p>
                <p className="text-xl font-black text-slate-900">{unlocks.length}</p>
              </div>
            </div>
          </div>
        </div>

        {UI_VISIBILITY.helperCreditPurchase ? (
          <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/80 to-indigo-50/40 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black text-slate-950">{t('link_credits_store.buy_banner_title')}</p>
              <p className="mt-1 text-sm font-medium text-slate-600">{t('link_credits_store.no_subscription')}</p>
            </div>
            <Link
              to={ROUTES.helperLinkCredits}
              className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white hover:bg-blue-700"
            >
              <Icons.CreditCard className="h-4 w-4" />
              {t('helper_credits.insufficient_buy_linkcredits')}
            </Link>
          </div>
        ) : (
          <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-900">
            {t('helper_credits.purchase_coming_soon')}
          </div>
        )}

        <CreditsUsageDashboard className="mb-5" />
        <CreditRefundStatusCard className="mb-5" />

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-black text-slate-950">{t('credits.history_title')}</h2>
          <div className="space-y-2">
            {transactions.length ? (
              transactions.slice(0, 20).map((tx) => (
                <div key={tx.id} className="grid grid-cols-[1fr_auto] gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{tx.description}</p>
                    <p className="text-xs font-medium text-slate-500">{new Date(tx.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-black ${tx.amount >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {tx.amount >= 0 ? '+' : ''}
                      {tx.amount}
                    </p>
                    <p className="text-[11px] font-bold text-slate-400">{t('credits.balance_after', { count: tx.balanceAfter })}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm font-bold text-slate-500">
                {t('credits.history_empty')}
              </p>
            )}
          </div>
        </div>
        </div>
      </div>
    </AppPageShell>
  );
}
