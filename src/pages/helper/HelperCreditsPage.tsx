import * as Icons from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useCredits } from '@/context/CreditContext';
import { ROUTES } from '@/utils/constants';
import { UI_VISIBILITY } from '@/config/uiVisibility';

export default function HelperCreditsPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { wallet, transactions, packages, unlocks, loading } = useCredits();

  if (profile?.role !== 'helper') {
    return <Navigate to={ROUTES.clientDashboard} replace />;
  }

  const creditsUsed = wallet?.totalSpent ?? 0;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#f0f2f5] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <button
          type="button"
          onClick={() => navigate(ROUTES.helperDashboard)}
          className="mb-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-600 shadow-sm hover:text-slate-950"
        >
          <Icons.ArrowLeft className="h-4 w-4" />
          {t('app_pages.back_home')}
        </button>

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
                <p className="text-2xl font-black text-blue-950">{loading ? '…' : wallet?.balance ?? 0}</p>
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

        {!UI_VISIBILITY.helperCreditPurchase ? (
          <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-900">
            {t('helper_credits.purchase_coming_soon')}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {packages.map((pkg) => (
            <div key={pkg.id} className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              {pkg.highlightLabel ? (
                <span className="absolute right-4 top-4 rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white">
                  {pkg.highlightLabel}
                </span>
              ) : null}
              <h2 className="text-lg font-black text-slate-950">{pkg.name}</h2>
              <p className="mt-3 text-3xl font-black text-slate-950">{pkg.credits}</p>
              <p className="text-sm font-bold text-slate-500">{t('credits.credits_unit')}</p>
              <p className="mt-4 text-xl font-black text-blue-700">CAD ${pkg.priceCad}</p>
              <button
                type="button"
                disabled={!UI_VISIBILITY.helperCreditPurchase}
                className="mt-5 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Icons.CreditCard className="h-4 w-4" />
                {UI_VISIBILITY.helperCreditPurchase ? t('credits.buy_package') : t('helper_credits.coming_soon_cta')}
              </button>
            </div>
          ))}
        </div>

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
  );
}
