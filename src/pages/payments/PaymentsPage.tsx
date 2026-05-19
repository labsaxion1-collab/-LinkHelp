import { useState } from 'react';
import * as Icons from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { useCredits } from '@/context/CreditContext';
import { useAuth } from '@/context/AuthContext';
import { createCheckoutSession } from '@/services/paymentService';
import { ROUTES } from '@/utils/constants';

export default function PaymentsPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { wallet, packages, transactions, unlocks, adminAdjustCredits } = useCredits();
  const [busyPackage, setBusyPackage] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [adminHelperId, setAdminHelperId] = useState('');
  const [adminAmount, setAdminAmount] = useState(10);
  const [adminDescription, setAdminDescription] = useState('Ajuste administrativo');
  const isAdmin = session?.user?.app_metadata?.role === 'admin';

  const buyPackage = async (packageId: string) => {
    setBusyPackage(packageId);
    setError('');
    try {
      const origin = window.location.origin;
      const { url } = await createCheckoutSession({
        packageId,
        successUrl: `${origin}${ROUTES.payments}?checkout=success`,
        cancelUrl: `${origin}${ROUTES.payments}?checkout=cancelled`,
      });
      window.location.href = url;
    } catch {
      setError(t('credits.checkout_not_configured'));
    } finally {
      setBusyPackage(null);
    }
  };

  const submitAdminAdjustment = async () => {
    if (!adminHelperId.trim()) return;
    setError('');
    try {
      await adminAdjustCredits(adminHelperId.trim(), adminAmount, adminDescription.trim() || 'Ajuste administrativo');
      setAdminHelperId('');
    } catch {
      setError(t('credits.admin_error'));
    }
  };

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
              <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">{t('credits.buy_title')}</h1>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-slate-500">{t('credits.buy_sub')}</p>
            </div>
            <div className="rounded-2xl bg-blue-50 px-5 py-4 text-center">
              <p className="text-xs font-black uppercase tracking-wide text-blue-500">{t('helper_dashboard.credits_label')}</p>
              <p className="text-3xl font-black text-blue-950">{wallet?.balance ?? 0}</p>
            </div>
          </div>
        </div>

        {error ? (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-4">
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
                onClick={() => buyPackage(pkg.id)}
                disabled={busyPackage === pkg.id}
                className="mt-5 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white hover:bg-black disabled:opacity-70"
              >
                {busyPackage === pkg.id ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : <Icons.CreditCard className="h-4 w-4" />}
                {t('credits.buy_package')}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-black text-slate-950">{t('credits.history_title')}</h2>
          <div className="space-y-2">
            {transactions.length ? transactions.slice(0, 12).map((tx) => (
              <div key={tx.id} className="grid grid-cols-[1fr_auto] gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{tx.description}</p>
                  <p className="text-xs font-medium text-slate-500">{new Date(tx.createdAt).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-black ${tx.amount >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {tx.amount >= 0 ? '+' : ''}{tx.amount}
                  </p>
                  <p className="text-[11px] font-bold text-slate-400">{t('credits.balance_after', { count: tx.balanceAfter })}</p>
                </div>
              </div>
            )) : (
              <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm font-bold text-slate-500">
                {t('credits.history_empty')}
              </p>
            )}
          </div>
        </div>

        {isAdmin ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-950">{t('credits.admin_title')}</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">{t('credits.admin_sub')}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_120px_1fr_auto]">
              <input
                value={adminHelperId}
                onChange={(e) => setAdminHelperId(e.target.value)}
                placeholder={t('credits.admin_helper_id')}
                className="min-h-[44px] rounded-xl border border-slate-200 px-3 text-sm font-bold focus:border-blue-500 focus:outline-none"
              />
              <input
                type="number"
                value={adminAmount}
                onChange={(e) => setAdminAmount(Number(e.target.value))}
                className="min-h-[44px] rounded-xl border border-slate-200 px-3 text-sm font-bold focus:border-blue-500 focus:outline-none"
              />
              <input
                value={adminDescription}
                onChange={(e) => setAdminDescription(e.target.value)}
                className="min-h-[44px] rounded-xl border border-slate-200 px-3 text-sm font-bold focus:border-blue-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={submitAdminAdjustment}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700"
              >
                {t('credits.admin_apply')}
              </button>
            </div>
            <p className="mt-3 text-xs font-bold text-slate-500">
              {t('credits.admin_unlocked_seen', { count: unlocks.length })}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
