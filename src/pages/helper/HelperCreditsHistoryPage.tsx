import { useEffect, useMemo, useState } from 'react';
import * as Icons from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useCredits } from '@/context/CreditContext';
import { useWalletBalance } from '@/hooks/useWalletBalance';
import { AppPageShell } from '@/components/design-system/AppPageShell';
import { CreditTransactionDetailModal } from '@/components/credits/CreditTransactionDetailModal';
import { CreditTransactionHistoryList } from '@/components/credits/CreditTransactionHistoryList';
import { ROUTES } from '@/utils/constants';
import { writeAccountHomeSnapshot } from '@/utils/accountSessionSnapshot';

/**
 * Full LinkCredits history for helpers — credit_transactions only, no store chrome.
 */
export default function HelperCreditsHistoryPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { profile, session } = useAuth();
  const { transactions, unlocks } = useCredits();
  const { balance, loading, refresh: refreshWallet } = useWalletBalance();
  const [selectedTx, setSelectedTx] = useState<(typeof transactions)[number] | null>(null);
  const lcUnit = t('credits.lc_unit');

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

  return (
    <AppPageShell wide className="relative min-w-0 overflow-x-hidden bg-[#030B1A] px-0 pb-24 pt-3">
      <div className="relative mx-auto max-w-3xl px-4 sm:px-5">
        <header className="mb-3 flex items-start gap-3">
          <button
            type="button"
            onClick={() => navigate(ROUTES.helperCredits)}
            className="mt-0.5 inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border border-white/10 bg-white/[0.05] px-2.5 text-xs font-bold text-slate-200 hover:bg-white/[0.08]"
          >
            <Icons.ArrowLeft className="h-3.5 w-3.5" />
            {t('helper_credits.back_to_summary')}
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-black tracking-tight text-white sm:text-lg">
              {t('helper_credits.history_full_title')}
            </h1>
            <p className="mt-0.5 truncate text-[12px] font-semibold tabular-nums text-slate-400">
              {loading && balance == null ? '…' : `${balance ?? 0} ${lcUnit}`}
            </p>
          </div>
        </header>

        <CreditTransactionHistoryList
          transactions={sortedTx}
          unlocks={unlocks}
          limit={sortedTx.length}
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
