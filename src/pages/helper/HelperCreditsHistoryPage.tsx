import { useEffect, useMemo, useState } from 'react';
import * as Icons from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useCredits } from '@/context/CreditContext';
import { useWalletBalance } from '@/hooks/useWalletBalance';
import { AppPageShell } from '@/components/design-system/AppPageShell';
import { CreditTransactionDetailModal } from '@/components/credits/CreditTransactionDetailModal';
import { CreditTransactionHistoryList } from '@/components/credits/CreditTransactionHistoryList';
import { LinkCreditsHistoryFilterBar } from '@/components/credits/LinkCreditsHistoryFilterBar';
import { LinkCreditsHistorySummary } from '@/components/credits/LinkCreditsHistorySummary';
import { writeAccountHomeSnapshot } from '@/utils/accountSessionSnapshot';
import { resolveCreditTransactionAmount, findUnlockForTransaction } from '@/utils/creditTransactionDisplay';
import {
  LINK_CREDITS_HISTORY_FROM_KEY,
  parseLinkCreditsHistoryFrom,
  resolveLinkCreditsHistoryBackPath,
  type LinkCreditsHistoryLocationState,
} from '@/utils/linkCreditsHistoryNav';
import {
  computeLinkCreditsHistoryTotals,
  filterLinkCreditsHistoryAmounts,
  type LinkCreditsHistoryFilter,
} from '@/utils/linkCreditsHistoryTotals';

/**
 * Full LinkCredits history for helpers — dark mirror of the client history layout.
 * Source: credit_transactions only (via CreditContext).
 */
export default function HelperCreditsHistoryPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, session } = useAuth();
  const { transactions, unlocks, loading: creditsLoading } = useCredits();
  const { balance, loading, refresh: refreshWallet } = useWalletBalance();
  const [selectedTx, setSelectedTx] = useState<(typeof transactions)[number] | null>(null);
  const [filter, setFilter] = useState<LinkCreditsHistoryFilter>('all');
  const lcUnit = t('credits.lc_unit');

  const from = parseLinkCreditsHistoryFrom(
    (location.state as LinkCreditsHistoryLocationState | null)?.[LINK_CREDITS_HISTORY_FROM_KEY],
  );
  const backPath = resolveLinkCreditsHistoryBackPath('helper', from);

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

  const sortedTx = useMemo(
    () => [...transactions].sort((a, b) => b.createdAt - a.createdAt),
    [transactions],
  );

  const amounts = useMemo(
    () =>
      sortedTx.map((tx) =>
        resolveCreditTransactionAmount(tx, findUnlockForTransaction(tx, unlocks)),
      ),
    [sortedTx, unlocks],
  );

  const totals = useMemo(() => computeLinkCreditsHistoryTotals(amounts), [amounts]);

  const filteredTx = useMemo(
    () =>
      filterLinkCreditsHistoryAmounts(sortedTx, filter, (tx) =>
        resolveCreditTransactionAmount(tx, findUnlockForTransaction(tx, unlocks)),
      ),
    [sortedTx, filter, unlocks],
  );

  const listLoading = creditsLoading && sortedTx.length === 0;

  return (
    <AppPageShell
      wide
      className="relative min-w-0 overflow-x-hidden !px-0 !py-0 bg-[#030B1A] pb-28 pt-3 md:pb-10"
    >
      <div className="pointer-events-none absolute -left-32 top-16 h-[22rem] w-[22rem] rounded-full bg-blue-700/15 blur-[90px]" />
      <div className="pointer-events-none absolute -right-24 top-[28rem] h-[18rem] w-[18rem] rounded-full bg-indigo-600/10 blur-[80px]" />

      <div className="relative mx-auto max-w-3xl space-y-3 px-4 sm:px-5">
        <header className="flex items-start gap-3">
          <button
            type="button"
            aria-label={t('helper_credits.back_to_summary')}
            onClick={() => navigate(backPath)}
            className="mt-0.5 inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-blue-400/35 bg-[#0B1A33] px-3 text-xs font-black text-white shadow-[0_6px_18px_rgba(37,99,255,0.18)] ring-1 ring-white/10 transition hover:border-blue-300/50 hover:bg-[#102445]"
          >
            <Icons.ArrowLeft className="h-4 w-4 text-blue-300" aria-hidden />
            <span>{t('helper_credits.back_to_summary')}</span>
          </button>
          <div className="min-w-0 flex-1 pt-0.5">
            <h1 className="text-base font-black leading-snug tracking-tight text-white sm:truncate sm:text-lg">
              {t('helper_credits.history_full_title')}
            </h1>
            <p className="mt-0.5 truncate text-[12px] font-semibold tabular-nums text-slate-400">
              {loading && balance == null ? '…' : `${balance ?? 0} ${lcUnit}`}
            </p>
          </div>
        </header>

        {/* Contained dark panel — mirrors the Client light card hierarchy */}
        <section className="space-y-3 rounded-2xl border border-white/10 bg-[#071321]/92 p-3 shadow-[0_16px_40px_rgba(0,0,0,0.35)] ring-1 ring-blue-500/10 sm:p-4">
          <LinkCreditsHistorySummary
            variant="dark"
            totalReceived={totals.totalReceived}
            totalUsed={totals.totalUsed}
            balance={balance}
            loading={listLoading || (loading && balance == null)}
            lcUnit={lcUnit}
            labels={{
              received: t('credits.history_total_received'),
              used: t('credits.history_total_used'),
              balance: t('credits.history_balance_now'),
            }}
          />

          <LinkCreditsHistoryFilterBar
            variant="dark"
            filter={filter}
            onChange={setFilter}
            labels={{
              all: t('credits.history_filter_all'),
              inbound: t('credits.history_filter_in'),
              outbound: t('credits.history_filter_out'),
            }}
          />

          {listLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm font-semibold text-slate-400">
              <Icons.Loader2 className="h-4 w-4 animate-spin" />
              …
            </div>
          ) : (
            <CreditTransactionHistoryList
              transactions={filteredTx}
              unlocks={unlocks}
              limit={filteredTx.length}
              density="compact"
              variant="dark"
              onSelect={setSelectedTx}
              t={t}
              emptyLabel={t('credits.history_empty')}
              emptyHint={t('credits.history_empty_hint')}
              balanceAfterLabel={(count) => t('credits.balance_after', { count })}
            />
          )}
        </section>
      </div>

      <CreditTransactionDetailModal
        tx={selectedTx}
        unlocks={unlocks}
        open={Boolean(selectedTx)}
        onClose={() => setSelectedTx(null)}
      />
    </AppPageShell>
  );
}
