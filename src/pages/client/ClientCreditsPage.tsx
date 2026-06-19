import * as Icons from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { AppPageShell } from '@/components/design-system/AppPageShell';
import { DesktopBackButton } from '@/components/layout/DesktopBackButton';
import { ROUTES } from '@/utils/constants';
import { CLIENT_LINKCREDITS_ENABLED } from '@/config/clientLinkCredits';
import { coerceLegacyLinkCreditsDisplay, formatLinkCredits } from '@/utils/formatLinkCredits';
import { BRAND } from '@/utils/brandAssets';

export default function ClientCreditsPage() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { profile, authLoading } = useAuth();
  const balance = profile?.credits ?? 0;
  const balanceDisplay = authLoading ? '…' : formatLinkCredits(balance, language);
  const balanceAmount = authLoading ? 0 : coerceLegacyLinkCreditsDisplay(balance);

  return (
    <AppPageShell className="min-w-0 pb-10">
      <DesktopBackButton to={ROUTES.clientDashboard} />

      <div className="mx-auto mt-4 max-w-lg">
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
                {t('client_credits.buy_title')}
              </h1>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-blue-100/90 bg-white/90 px-5 py-4 text-center shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              {t('client_credits.your_credits')}
            </p>
            <p className="mt-1 text-4xl font-black tabular-nums text-slate-950">{balanceDisplay}</p>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              {authLoading
                ? '…'
                : t('client_credits.current_balance', { amount: balanceAmount })}
            </p>
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
            onClick={() => navigate(ROUTES.clientDashboard)}
            className="mt-6 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-bold text-white transition-colors hover:bg-black"
          >
            <Icons.ArrowLeft className="h-4 w-4 shrink-0" />
            {t('client_credits.back_dashboard')}
          </button>
        </div>
      </div>
    </AppPageShell>
  );
}
