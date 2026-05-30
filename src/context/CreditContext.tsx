import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { isSupabaseConfigured } from '@/lib/supabase';
import { fetchRemoteCreditState, getWalletBalance } from '@/services/supabase/creditsRemote';
import { remoteEnsureSignupCredits } from '@/services/supabase/rewardsRemote';
import {
  InsufficientCreditsError,
  localDebit,
  remoteDebitApplicationInterest,
  remoteDebitApplicationSelected,
} from '@/services/helperLeadCredits';
import type { CreditPackage, CreditTransaction, CreditWallet, OpportunityUnlock } from '@/types/credits';
import { CREDIT_PACKAGES, HELPER_SIGNUP_BONUS_CREDITS } from '@/utils/credits';

type CreditContextValue = {
  wallet: CreditWallet | null;
  /** Balance shown in UI (includes optimistic debits). */
  displayBalance: number | null;
  transactions: CreditTransaction[];
  unlocks: OpportunityUnlock[];
  packages: CreditPackage[];
  loading: boolean;
  refreshCredits: () => Promise<void>;
  chargeApplicationInterest: (requestId: string, amount?: number) => Promise<void>;
  chargeApplicationSelected: (requestId: string, applicationId: string, amount: number) => Promise<void>;
  /** Returns rollback fn if optimistic debit applied. */
  applyOptimisticDebit: (amount: number) => () => void;
};

const CreditContext = createContext<CreditContextValue | null>(null);

function localKey(helperId: string) {
  return `linkhelp_credit_state_${helperId}`;
}

function newWallet(helperId: string): CreditWallet {
  const now = Date.now();
  return {
    id: `wallet_${helperId}`,
    helperId,
    balance: HELPER_SIGNUP_BONUS_CREDITS,
    totalPurchased: 0,
    totalBonus: HELPER_SIGNUP_BONUS_CREDITS,
    totalSpent: 0,
    createdAt: now,
    updatedAt: now,
  };
}

function bonusTx(helperId: string): CreditTransaction {
  return {
    id: `tx_bonus_${helperId}`,
    helperId,
    type: 'FREE_BONUS',
    amount: HELPER_SIGNUP_BONUS_CREDITS,
    balanceAfter: HELPER_SIGNUP_BONUS_CREDITS,
    description: 'Créditos iniciais de boas-vindas',
    createdAt: Date.now(),
  };
}

export function CreditProvider({ children }: { children: React.ReactNode }) {
  const { session, profile } = useAuth();

  const helperId = session?.user?.id ?? profile?.id ?? '';
  const isHelper = profile?.role === 'helper';
  const remote = isSupabaseConfigured() && Boolean(session);
  const [wallet, setWallet] = useState<CreditWallet | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [unlocks, setUnlocks] = useState<OpportunityUnlock[]>([]);
  const [packages, setPackages] = useState<CreditPackage[]>(CREDIT_PACKAGES);
  const [loading, setLoading] = useState(false);
  const [optimisticDelta, setOptimisticDelta] = useState(0);

  const persistLocal = useCallback(
    (next: { wallet: CreditWallet; transactions: CreditTransaction[]; unlocks: OpportunityUnlock[] }) => {
      if (!helperId) return;
      localStorage.setItem(localKey(helperId), JSON.stringify(next));
    },
    [helperId],
  );

  const refreshCredits = useCallback(async () => {
    if (!helperId || !isHelper) {
      setWallet(null);
      setTransactions([]);
      setUnlocks([]);
      return;
    }
    setLoading(true);
    try {
      if (remote) {
        await remoteEnsureSignupCredits(helperId, 'helper');
        const state = await fetchRemoteCreditState(helperId);
        let wallet = state.wallet;
        if (!wallet) {
          const balance = await getWalletBalance(helperId);
          const w = newWallet(helperId);
          wallet = { ...w, balance, totalBonus: Math.max(w.totalBonus, balance) };
        } else if (wallet.balance === 0 && !state.transactions.some((tx) => tx.type === 'FREE_BONUS')) {
          const balance = await getWalletBalance(helperId);
          wallet = { ...wallet, balance, totalBonus: Math.max(wallet.totalBonus, balance) };
        }
        setWallet(wallet);
        setTransactions(state.transactions);
        setUnlocks(state.unlocks);
        setPackages(state.packages);
        return;
      }

      const stored = localStorage.getItem(localKey(helperId));
      if (stored) {
        const parsed = JSON.parse(stored) as {
          wallet: CreditWallet;
          transactions: CreditTransaction[];
          unlocks: OpportunityUnlock[];
        };
        setWallet(parsed.wallet);
        setTransactions(parsed.transactions);
        setUnlocks(parsed.unlocks);
      } else {
        const w = newWallet(helperId);
        const tx = bonusTx(helperId);
        persistLocal({ wallet: w, transactions: [tx], unlocks: [] });
        setWallet(w);
        setTransactions([tx]);
        setUnlocks([]);
      }
      setPackages(CREDIT_PACKAGES);
    } catch (e) {
      console.warn('[LinkHelp] refreshCredits', e);
      const w = newWallet(helperId);
      setWallet({ ...w, balance: 0, totalBonus: 0 });
      setTransactions([]);
      setUnlocks([]);
      setPackages(CREDIT_PACKAGES);
    } finally {
      setLoading(false);
    }
  }, [helperId, isHelper, persistLocal, remote]);

  useEffect(() => {
    void refreshCredits();
  }, [refreshCredits]);

  useEffect(() => {
    setOptimisticDelta(0);
  }, [wallet?.balance, wallet?.updatedAt]);

  const displayBalance =
    wallet != null ? Math.max(0, wallet.balance + optimisticDelta) : null;

  const applyOptimisticDebit = useCallback((amount: number) => {
    setOptimisticDelta((d) => d - amount);
    return () => setOptimisticDelta((d) => d + amount);
  }, []);

  const chargeApplicationInterest = useCallback(
    async (requestId: string, amount = 1) => {
      if (!helperId || !isHelper) throw new Error('NOT_HELPER');
      if (remote) {
        await remoteDebitApplicationInterest(helperId, requestId, amount);
        await refreshCredits();
        return;
      }
      if (!wallet) throw new InsufficientCreditsError(amount);
      const next = localDebit(wallet, transactions, {
        helperId,
        type: 'APPLICATION_INTEREST',
        amount,
        requestId,
        description: 'Interesse em oportunidade',
      });
      setWallet({ ...wallet, ...next.wallet, updatedAt: Date.now() });
      setTransactions(next.transactions);
      persistLocal({ wallet: { ...wallet, ...next.wallet }, transactions: next.transactions, unlocks });
    },
    [helperId, isHelper, remote, refreshCredits, wallet, transactions, unlocks, persistLocal],
  );

  const chargeApplicationSelected = useCallback(
    async (requestId: string, applicationId: string, amount: number) => {
      if (!helperId || !isHelper) throw new Error('NOT_HELPER');
      if (remote) {
        await remoteDebitApplicationSelected(helperId, requestId, applicationId, amount);
        await refreshCredits();
        return;
      }
      if (!wallet) throw new InsufficientCreditsError(amount);
      const next = localDebit(wallet, transactions, {
        helperId,
        type: 'APPLICATION_SELECTED',
        amount,
        requestId,
        applicationId,
        description: 'Contratação confirmada pelo cliente',
      });
      setWallet({ ...wallet, ...next.wallet, updatedAt: Date.now() });
      setTransactions(next.transactions);
      persistLocal({ wallet: { ...wallet, ...next.wallet }, transactions: next.transactions, unlocks });
    },
    [helperId, isHelper, remote, refreshCredits, wallet, transactions, unlocks, persistLocal],
  );

  const value = useMemo(
    () => ({
      wallet,
      displayBalance,
      transactions,
      unlocks,
      packages,
      loading,
      refreshCredits,
      chargeApplicationInterest,
      chargeApplicationSelected,
      applyOptimisticDebit,
    }),
    [
      wallet,
      displayBalance,
      transactions,
      unlocks,
      packages,
      loading,
      refreshCredits,
      chargeApplicationInterest,
      chargeApplicationSelected,
      applyOptimisticDebit,
    ],
  );

  return <CreditContext.Provider value={value}>{children}</CreditContext.Provider>;
}

export function useCredits() {
  const context = useContext(CreditContext);
  if (!context) throw new Error('useCredits must be used within CreditProvider');
  return context;
}
