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
 * Full LinkCredits history for helpers — credit_transactions only, no store chrome.
 */
export default function HelperCreditsHistoryPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, session } = useAuth();
  const { transactions, unlocks } = useCredits();
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

  return (
    <AppPageShell wide className="relative min-w-0 overflow-x-hidden bg-[#030B1A] px-0 pb-24 pt-3">
      <div className="relative mx-auto max-w-3xl space-y-3 px-4 sm:px-5">
        <header className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => navigate(backPath)}
            className="mt-0.5 inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border border-white/10 bg-white/[0.05] px-2.5 text-xs font-bold text-slate-200 hover:bg-white/[0.08]"
          >
            <Icons.ArrowLeft className="h-3.5 w-3.5" />
            {t('helper_credits.back_to_summary')}
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-black leading-snug tracking-tight text-white sm:truncate sm:text-lg">
              {t('helper_credits.history_full_title')}
            </h1>
            <p className="mt-0.5 truncate text-[12px] font-semibold tabular-nums text-slate-400">
              {loading && balance == null ? '…' : `${balance ?? 0} ${lcUnit}`}
            </p>
          </div>
        </header>

        <LinkCreditsHistorySummary
          variant="dark"
          totalReceived={totals.totalReceived}
          totalUsed={totals.totalUsed}
          balance={balance}
          loading={loading && balance == null}
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

        <CreditTransactionDetailModal
          tx={selectedTx}
          unlocks={unlocks}
          open={Boolean(selectedTx)}
          onClose={() => setSelectedTx(null)}
        />
      </div>
    </AppPageShell>
  );
}
