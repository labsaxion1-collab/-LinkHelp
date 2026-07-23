import { History, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { BRAND } from '@/utils/brandAssets';
import { formatLinkCredits } from '@/utils/formatLinkCredits';
import { ProfileSectionHeader } from '@/components/profile/ProfileSectionHeader';

type Props = {
  balance: number;
  loading?: boolean;
  usedThisMonth?: number | null;
  buyRoute: string;
  historyRoute: string;
  showBuy?: boolean;
};

export function ProfileLinkCreditsCard({
  balance,
  loading = false,
  usedThisMonth = null,
  buyRoute,
  historyRoute,
  showBuy = true,
}: Props) {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const balanceLabel = loading ? '…' : formatLinkCredits(balance, language);
  const lcUnit = t('credits.lc_unit');

  return (
    <section>
      <ProfileSectionHeader title={t('profile_page.section_credits')} />
      <div className="rounded-[1.5rem] border border-slate-200/90 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.055)]">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-amber-50 ring-1 ring-amber-100">
                <img
                  src={BRAND.linkCreditCoin}
                  alt=""
                  className="h-9 w-9 rounded-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </span>
              <div className="min-w-0">
                <p className="text-[1.75rem] font-black tabular-nums leading-none text-slate-950">
                  {balanceLabel}
                </p>
                {usedThisMonth != null && !loading ? (
                  <p className="mt-1.5 text-[11px] font-semibold text-slate-500">
                    {t('profile_page.credits_used_month', { amount: `${usedThisMonth} ${lcUnit}` })}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex w-[9.5rem] shrink-0 flex-col gap-2 sm:w-44">
            {showBuy ? (
              <button
                type="button"
                onClick={() => navigate(buyRoute)}
                className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-2xl bg-[#2563FF] px-3 text-[12px] font-black text-white shadow-[0_8px_20px_rgba(37,99,255,0.28)] transition hover:bg-[#1D4ED8]"
              >
                <Wallet className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="truncate">{t('profile_page.buy_credits')}</span>
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => navigate(historyRoute)}
              className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-2xl border border-[#2563FF]/30 bg-white px-3 text-[12px] font-black text-[#2563FF] transition hover:bg-[#F5F8FF]"
            >
              <History className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">{t('profile_page.view_history')}</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
