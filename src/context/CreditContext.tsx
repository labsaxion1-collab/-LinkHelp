import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { isSupabaseConfigured } from '@/lib/supabase';
import { fetchRemoteCreditState } from '@/services/supabase/creditsRemote';
import type { CreditPackage, CreditTransaction, CreditWallet, OpportunityUnlock } from '@/types/credits';
import { CREDIT_PACKAGES, HELPER_SIGNUP_BONUS_CREDITS } from '@/utils/credits';

type CreditContextValue = {
  wallet: CreditWallet | null;
  transactions: CreditTransaction[];
  unlocks: OpportunityUnlock[];
  packages: CreditPackage[];
  loading: boolean;
  refreshCredits: () => Promise<void>;
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
        const state = await fetchRemoteCreditState(helperId);
        setWallet(state.wallet);
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
    } finally {
      setLoading(false);
    }
  }, [helperId, isHelper, persistLocal, remote]);

  useEffect(() => {
    void refreshCredits();
  }, [refreshCredits]);

  const value = useMemo(
    () => ({
      wallet,
      transactions,
      unlocks,
      packages,
      loading,
      refreshCredits,
    }),
    [wallet, transactions, unlocks, packages, loading, refreshCredits],
  );

  return <CreditContext.Provider value={value}>{children}</CreditContext.Provider>;
}

export function useCredits() {
  const context = useContext(CreditContext);
  if (!context) throw new Error('useCredits must be used within CreditProvider');
  return context;
}
