import { useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { coerceLegacyLinkCreditsDisplay, formatLinkCredits } from '@/utils/formatLinkCredits';
import { AppPageShell } from '@/components/design-system/AppPageShell';
import { ROUTES } from '@/utils/constants';
import {
  fetchClientCreditLedger,
  startOfCurrentMonthIso,
} from '@/services/supabase/clientCreditLedgerRemote';

function SuccessLoader({ message }: { message?: string }) {
  return (
    <AppPageShell className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      {message ? <p className="text-sm font-medium text-slate-500">{message}</p> : null}
    </AppPageShell>
  );
}

export default function ClientCreditsSuccessPage() {
  const { t, language } = useLanguage();
  const {
    session,
    profile,
    authLoading,
    authBootstrapped,
    attemptSessionRecovery,
    refreshProfile,
  } = useAuth();
  const [refreshCount, setRefreshCount] = useState(0);
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [recoveryAttempted, setRecoveryAttempted] = useState(false);
  const profileKick = useRef(0);
  const balance = profile?.credits ?? null;
  const balanceDisplay =
    balance == null ? null : formatLinkCredits(balance, language);
  const balanceAmount = balance == null ? 0 : coerceLegacyLinkCreditsDisplay(balance);

  useEffect(() => {
    if (!authBootstrapped || authLoading || session || recoveryAttempted) return;

    let cancelled = false;
    setRecoveryBusy(true);
    void attemptSessionRecovery().finally(() => {
      if (!cancelled) {
        setRecoveryBusy(false);
        setRecoveryAttempted(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [authBootstrapped, authLoading, session, recoveryAttempted, attemptSessionRecovery]);

  useEffect(() => {
    if (!authBootstrapped || authLoading || !session?.user || profile) return;
    if (profileKick.current >= 4) return;
    profileKick.current += 1;
    void refreshProfile(session.user);
  }, [authBootstrapped, authLoading, session, profile, refreshProfile]);

  useEffect(() => {
    if (!session || profile?.role !== 'client') return;

    const reload = async () => {
      await refreshProfile();
      await fetchClientCreditLedger({ limit: 20 });
      await fetchClientCreditLedger({ since: startOfCurrentMonthIso(), limit: 500 });
    };

    void reload();
    const timer = window.setInterval(() => {
      setRefreshCount((n) => {
        if (n >= 4) {
          window.clearInterval(timer);
          return n;
        }
        void reload();
        return n + 1;
      });
    }, 4000);

    return () => window.clearInterval(timer);
  }, [session, profile?.role, refreshProfile]);

  const waitingForAuth =
    !authBootstrapped || authLoading || recoveryBusy || (!session && !recoveryAttempted);
  const waitingForProfile = Boolean(session?.user && !profile);

  if (waitingForAuth) {
    return <SuccessLoader message={t('client_credits.restoring_session')} />;
  }

  if (waitingForProfile) {
    return <SuccessLoader message={t('client_credits.loading_profile')} />;
  }

  if (!session) {
    return <Navigate to={ROUTES.login} replace state={{ from: ROUTES.clientCreditsSuccess }} />;
  }

  if (profile && profile.role !== 'client') {
    return <Navigate to={ROUTES.clientCredits} replace />;
  }

  return (
    <AppPageShell className="flex min-h-[60vh] items-center justify-center">
      <div className="mx-auto max-w-md rounded-[1.75rem] border border-emerald-200 bg-white p-8 text-center shadow-lg shadow-emerald-900/5">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </div>
        <h1 className="text-xl font-black text-slate-950">{t('client_credits.purchase_success_title')}</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          {t('client_credits.purchase_success_body')}
        </p>

        {balanceDisplay ? (
          <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-2.5 text-sm font-black text-emerald-700">
            {t('client_credits.balance', { amount: balanceAmount })}
          </p>
        ) : null}

        {refreshCount < 5 ? (
          <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            {t('client_credits.verifying_balance')}
          </p>
        ) : null}

        <Link
          to={ROUTES.clientCredits}
          className="mt-6 inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-blue-600 px-4 text-sm font-black text-white hover:bg-blue-700"
        >
          {t('client_credits.back_to_credits')}
        </Link>
      </div>
    </AppPageShell>
  );
}
