import { useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useCredits } from '@/context/CreditContext';
import { AppPageShell } from '@/components/design-system/AppPageShell';
import { ROUTES } from '@/utils/constants';

export default function HelperCreditsSuccessPage() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const { refreshCredits } = useCredits();

  useEffect(() => {
    void refreshCredits();
    const timer = window.setInterval(() => void refreshCredits(), 4000);
    return () => window.clearInterval(timer);
  }, [refreshCredits]);

  if (profile?.role !== 'helper') {
    return <Navigate to={ROUTES.clientDashboard} replace />;
  }

  return (
    <AppPageShell className="flex min-h-[60vh] items-center justify-center">
      <div className="mx-auto max-w-md rounded-[1.75rem] border border-emerald-200 bg-white p-8 text-center shadow-lg shadow-emerald-900/5">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </div>
        <h1 className="text-xl font-black text-slate-950">{t('link_credits_store.success_title')}</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{t('link_credits_store.success_body')}</p>
        <Link
          to={ROUTES.helperDashboard}
          className="mt-6 inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-blue-600 px-4 text-sm font-black text-white hover:bg-blue-700"
        >
          {t('link_credits_store.back_to_dashboard')}
        </Link>
      </div>
    </AppPageShell>
  );
}
