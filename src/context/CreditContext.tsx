import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { isSupabaseConfigured } from '@/lib/supabase';
import { readStoredAppMode } from '@/utils/appModeStorage';
import { resolveEffectiveRole } from '@/utils/userRole';
import { fetchRemoteCreditState } from '@/services/supabase/creditsRemote';
import {
  InsufficientCreditsError,
  localDebit,
  remoteDebitApplicationInterest,
  remoteDebitApplicationSelected,
} from '@/services/helperLeadCredits';
import type { CreditPackage, CreditTransaction, CreditWallet, OpportunityUnlock } from '@/types/credits';
import { CREDIT_PACKAGES } from '@/utils/credits';
import {
  readAccountHomeSnapshot,
  writeAccountHomeSnapshot,
} from '@/utils/accountSessionSnapshot';

type CreditContextValue = {
  wallet: CreditWallet | null;
  /** Balance for the authenticated helper (from credit_wallets). */
  displayBalance: number | null;
  transactions: CreditTransaction[];
  unlocks: OpportunityUnlock[];
  packages: CreditPackage[];
  loading: boolean;
  refreshCredits: () => Promise<void>;
  chargeApplicationInterest: (requestId: string, amount?: number) => Promise<void>;
  chargeApplicationSelected: (requestId: string, applicationId: string, amount: number) => Promise<void>;
  applyOptimisticDebit: (amount: number) => () => void;
};

const CreditContext = createContext<CreditContextValue | null>(null);

export function CreditProvider({ children }: { children: React.ReactNode }) {
  const { session, profile, sessionConfirmed } = useAuth();

  const currentUserId = sessionConfirmed ? (session?.user?.id ?? null) : null;
  const storedMode = readStoredAppMode(currentUserId);
  const effectiveRole = resolveEffectiveRole(profile, session?.user, storedMode);
  const isHelper = effectiveRole === 'helper';
  const helperId = isHelper ? (currentUserId ?? profile?.id ?? '') : '';
  const remote = isSupabaseConfigured() && Boolean(sessionConfirmed) && Boolean(session);

  const [wallet, setWallet] = useState<CreditWallet | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [unlocks, setUnlocks] = useState<OpportunityUnlock[]>([]);
  const [packages, setPackages] = useState<CreditPackage[]>(CREDIT_PACKAGES);
  const [loading, setLoading] = useState(false);
  const [optimisticDelta, setOptimisticDelta] = useState(0);
  const [cachedBalance, setCachedBalance] = useState<number | null>(() => {
    const hintId = session?.user?.id ?? profile?.id ?? null;
    if (!hintId) return null;
    return readAccountHomeSnapshot(hintId)?.lcBalanceVisual ?? null;
  });

  useEffect(() => {
    if (!currentUserId) {
      setCachedBalance(null);
      return;
    }
    const snap = readAccountHomeSnapshot(currentUserId);
    if (snap?.lcBalanceVisual != null) setCachedBalance(snap.lcBalanceVisual);
  }, [currentUserId]);

  const refreshCredits = useCallback(async () => {
    if (!helperId || !isHelper || !sessionConfirmed) {
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
        if (state.wallet && profile) {
          const nextBalance = Math.max(0, Math.round(state.wallet.balance));
          setCachedBalance(nextBalance);
          writeAccountHomeSnapshot({
            userId: helperId,
            role: 'helper',
            displayName: profile.name,
            avatarUrl: profile.avatar_url,
            lcBalanceVisual: nextBalance,
          });
        }
        return;
      }

      setWallet(null);
      setTransactions([]);
      setUnlocks([]);
      setPackages(CREDIT_PACKAGES);
    } catch (e) {
      console.warn('[LinkHelp] refreshCredits', e);
      setWallet(null);
      setTransactions([]);
      setUnlocks([]);
      setPackages(CREDIT_PACKAGES);
    } finally {
      setLoading(false);
    }
  }, [helperId, isHelper, remote, profile, sessionConfirmed]);

  useEffect(() => {
    void refreshCredits();
  }, [refreshCredits]);

  useEffect(() => {
    setOptimisticDelta(0);
  }, [wallet?.balance, wallet?.updatedAt]);

  // Prefer live wallet; keep cached visual balance to avoid flash-to-zero / null while loading.
  const displayBalance =
    wallet != null ? Math.max(0, wallet.balance + optimisticDelta) : cachedBalance;

  const applyOptimisticDebit = useCallback((amount: number) => {
    setOptimisticDelta((d) => d - amount);
    return () => setOptimisticDelta((d) => d + amount);
  }, []);

  const chargeApplicationInterest = useCallback(
    async (requestId: string, amount = 1) => {
      if (!sessionConfirmed) throw new Error('SESSION_UNCONFIRMED');
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
    },
    [helperId, isHelper, remote, refreshCredits, wallet, transactions, sessionConfirmed],
  );

  const chargeApplicationSelected = useCallback(
    async (requestId: string, applicationId: string, amount: number) => {
      if (!sessionConfirmed) throw new Error('SESSION_UNCONFIRMED');
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
    },
    [helperId, isHelper, remote, refreshCredits, wallet, transactions, sessionConfirmed],
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
