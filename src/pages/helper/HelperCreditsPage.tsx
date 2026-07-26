import { useEffect, useMemo, useState } from 'react';
import * as Icons from 'lucide-react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useCredits } from '@/context/CreditContext';
import { useWalletBalance } from '@/hooks/useWalletBalance';
import { HelperDashboardNav } from '@/components/helpers/HelperDashboardNav';
import { ROUTES } from '@/utils/constants';
import { UI_VISIBILITY } from '@/config/uiVisibility';
import { AppPageShell } from '@/components/design-system/AppPageShell';
import { BRAND } from '@/utils/brandAssets';
import {
  CreditRefundStatusCard,
  OpportunityUnlocksList,
} from '@/components/features/CreditsUsageDashboard';
import { CreditTransactionDetailModal } from '@/components/credits/CreditTransactionDetailModal';
import { CreditTransactionHistoryList } from '@/components/credits/CreditTransactionHistoryList';
import { LinkCreditsCompactBalanceCard } from '@/components/credits/LinkCreditsCompactBalanceCard';
import { LinkCreditsCompactStatTile } from '@/components/credits/LinkCreditsCompactStatTile';
import { computeCreditsUsageSummary } from '@/utils/opportunityUnlockRefund';
import { writeAccountHomeSnapshot } from '@/utils/accountSessionSnapshot';

const PREVIEW_LIMIT = 3;

export default function HelperCreditsPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { profile, session } = useAuth();
  const { transactions, unlocks } = useCredits();
  const { balance, wallet, loading, refresh: refreshWallet } = useWalletBalance();
  const [selectedTx, setSelectedTx] = useState<(typeof transactions)[number] | null>(null);
  const [searchParams] = useSearchParams();
  const legacyHistoryQuery = searchParams.get('history') === '1';

  useEffect(() => {
    void refreshWallet();
  }, [refreshWallet]);

  useEffect(() => {
    const uid = session?.user?.id ?? profile?.id;
    if (!uid || balance == null || !profile) return;
    writeAccountHomeSnapshot({
      userId: uid,
      role: 'helper',
      displayName: profile.name,
      avatarUrl: profile.avatar_url,
      lcBalanceVisual: balance,
    });
  }, [balance, session?.user?.id, profile]);

  const creditsUsed = wallet?.totalSpent ?? 0;
  const usageSummary = computeCreditsUsageSummary(unlocks, transactions);
  const lcUnit = t('credits.lc_unit');

  const sortedTx = useMemo(
    () => [...transactions].sort((a, b) => b.createdAt - a.createdAt),
    [transactions],
  );

  const openHistory = () => {
    navigate(ROUTES.helperCreditsHistory);
  };

  // Legacy deep-link compat: /helper/credits?history=1 → dedicated history route.
  if (legacyHistoryQuery) {
    return <Navigate to={ROUTES.helperCreditsHistory} replace />;
  }

  return (
    <AppPageShell wide className="relative min-w-0 overflow-x-hidden bg-[#030B1A] px-0 pb-24 pt-0">
      <div className="pointer-events-none absolute -left-40 top-20 h-[28rem] w-[28rem] rounded-full bg-blue-700/10 blur-[100px]" />
      <div className="pointer-events-none absolute -right-32 top-[36rem] h-[22rem] w-[22rem] rounded-full bg-indigo-700/8 blur-[80px]" />

      <div className="relative mx-auto max-w-[1600px] px-4 sm:px-7">
        <HelperDashboardNav activeTab="match" onSelectFeedTab={() => {}} t={t} />

        <div className="mx-auto max-w-3xl space-y-3.5">
          <LinkCreditsCompactBalanceCard
            variant="dark"
            title={t('credits.linkcredits_brand')}
            balance={balance}
            loading={loading && balance == null}
            lcUnit={lcUnit}
            buyLabel={t('helper_credits.insufficient_buy_linkcredits')}
            historyLabel={t('helper_dashboard.view_history')}
            onBuy={() => {
              window.location.assign(ROUTES.helperLinkCredits);
            }}
            onHistory={openHistory}
          />

          <p className="px-1 text-center text-sm font-medium text-slate-400 sm:text-left">
            {t('helper_credits.page_sub')}
          </p>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <LinkCreditsCompactStatTile
              variant="dark"
              icon={Icons.Coins}
              label={t('helper_dashboard.credits_used_month')}
              value={`${creditsUsed} ${lcUnit}`}
              iconColor="text-blue-400"
              iconBg="bg-blue-500/15"
            />
            <LinkCreditsCompactStatTile
              variant="dark"
              icon={Icons.Target}
              label={t('helper_dashboard.unlocked_count')}
              value={String(unlocks.length)}
              iconColor="text-purple-400"
              iconBg="bg-purple-500/15"
            />
            <LinkCreditsCompactStatTile
              variant="dark"
              icon={Icons.RefreshCw}
              label={t('credits_usage.lc_returned')}
              value={`${usageSummary.lcReturned} ${lcUnit}`}
              iconColor="text-emerald-400"
              iconBg="bg-emerald-500/15"
            />
            <LinkCreditsCompactStatTile
              variant="dark"
              icon={Icons.ShieldCheck}
              label={t('helper_credits.stats_economize_title')}
              sub={t('helper_credits.stats_economize_sub')}
              iconColor="text-amber-400"
              iconBg="bg-amber-500/15"
            />
          </div>

          {UI_VISIBILITY.helperCreditPurchase ? (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1032B4] via-[#0C1E8A] to-[#091868] shadow-[0_12px_40px_rgba(10,30,120,0.55)]">
              <div className="relative flex min-h-0 items-center">
                <div className="flex-1 py-3.5 pl-4 pr-2">
                  <h3 className="text-[14px] font-black leading-tight text-white">
                    {t('link_credits_store.buy_banner_title')}
                  </h3>
                  <p className="mt-0.5 text-[11px] font-medium leading-snug text-blue-200/75">
                    {t('link_credits_store.no_subscription')}
                  </p>
                  <Link
                    to={ROUTES.helperLinkCredits}
                    className="mt-2.5 inline-flex h-[36px] items-center gap-1.5 rounded-full bg-blue-500 px-4 text-[12px] font-black text-white shadow-[0_3px_14px_rgba(59,130,246,0.45)] transition hover:bg-blue-400 active:scale-[0.98] motion-reduce:active:scale-100"
                  >
                    <Icons.ShoppingCart className="h-3.5 w-3.5" />
                    <span className="whitespace-nowrap">
                      {t('helper_credits.insufficient_buy_linkcredits')}
                    </span>
                  </Link>
                </div>
                <div className="relative shrink-0 overflow-hidden" style={{ height: '110px', width: '130px' }}>
                  <img
                    src={BRAND.walletIllustration}
                    alt=""
                    aria-hidden
                    className="absolute right-0 w-auto object-contain"
                    style={{ mixBlendMode: 'screen', height: '180px', top: '-18px' }}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-blue-900/40 bg-blue-950/30 px-4 py-3 text-sm font-medium text-blue-300">
              {t('helper_credits.purchase_coming_soon')}
            </div>
          )}

          <CreditRefundStatusCard unlocks={unlocks} transactions={transactions} />

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-black text-white">{t('credits.history_title')}</h2>
              <button
                type="button"
                onClick={openHistory}
                className="text-xs font-bold text-blue-400 hover:text-blue-300"
              >
                {t('helper_credits.see_all')} →
              </button>
            </div>
            <CreditTransactionHistoryList
              transactions={sortedTx}
              unlocks={unlocks}
              limit={PREVIEW_LIMIT}
              variant="dark"
              onSelect={setSelectedTx}
              t={t}
              emptyLabel={t('credits.history_empty')}
              emptyHint={t('credits.history_empty_hint')}
              balanceAfterLabel={(count) => t('credits.balance_after', { count })}
            />
          </div>

          <CreditTransactionDetailModal
            tx={selectedTx}
            unlocks={unlocks}
            open={Boolean(selectedTx)}
            onClose={() => setSelectedTx(null)}
          />

          <OpportunityUnlocksList unlocks={unlocks} />
        </div>
      </div>
    </AppPageShell>
  );
}
