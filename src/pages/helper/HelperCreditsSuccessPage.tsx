import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useWalletBalance } from '@/hooks/useWalletBalance';
import { AppPageShell } from '@/components/design-system/AppPageShell';
import { ROUTES } from '@/utils/constants';

export default function HelperCreditsSuccessPage() {
  const { t } = useLanguage();
  const { profile, authLoading } = useAuth();
  const { refresh, balance } = useWalletBalance();
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    // Refresh immediately and then poll every 4 s (up to 5 times) to catch
    // the webhook crediting the wallet. After 5 polls we stop and let the
    // user see whatever balance is showing.
    void refresh();
    const timer = window.setInterval(() => {
      setRefreshCount((n) => {
        if (n >= 4) {
          window.clearInterval(timer);
          return n;
        }
        void refresh();
        return n + 1;
      });
    }, 4000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  // Wait until auth has fully resolved before deciding where to send the user.
  // Without this guard, profile === null during initial load → role check fails
  // → user gets bounced to /client/dashboard → ProtectedRoute redirects to login.
  if (authLoading) {
    return (
      <AppPageShell className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </AppPageShell>
    );
  }

  if (profile?.role !== 'helper') {
    return <Navigate to={ROUTES.helperLinkCredits} replace />;
  }

  return (
    <AppPageShell className="flex min-h-[60vh] items-center justify-center">
      <div className="mx-auto max-w-md rounded-[1.75rem] border border-emerald-200 bg-white p-8 text-center shadow-lg shadow-emerald-900/5">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </div>
        <h1 className="text-xl font-black text-slate-950">{t('link_credits_store.success_title')}</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{t('link_credits_store.success_body')}</p>

        {balance !== null && (
          <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-2.5 text-sm font-black text-emerald-700">
            Saldo atual: {balance} LC
          </p>
        )}

        {refreshCount < 5 && (
          <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            Verificando saldo…
          </p>
        )}

        <Link
          to={ROUTES.helperLinkCredits}
          className="mt-6 inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-blue-600 px-4 text-sm font-black text-white hover:bg-blue-700"
        >
          {t('link_credits_store.back_to_dashboard')}
        </Link>
      </div>
    </AppPageShell>
  );
}
