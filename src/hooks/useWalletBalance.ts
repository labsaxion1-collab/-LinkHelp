import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useCredits } from '@/context/CreditContext';

/**
 * Single source for the logged-in helper's LinkCredits wallet balance.
 * Reads from credit_wallets via CreditProvider (authenticated user id).
 */
export function useWalletBalance() {
  const { session, profile } = useAuth();
  const { wallet, displayBalance, loading, refreshCredits } = useCredits();

  const currentUserId = session?.user?.id ?? profile?.id ?? null;

  useEffect(() => {
    if (currentUserId) {
      console.log('[wallet] currentUserId', currentUserId);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (profile?.id && currentUserId && profile.id !== currentUserId) {
      console.warn('[wallet] profile.id differs from session.user.id', {
        profileId: profile.id,
        sessionUserId: currentUserId,
      });
    }
  }, [profile?.id, currentUserId]);

  useEffect(() => {
    if (displayBalance != null) {
      console.log('[wallet] loaded balance', displayBalance);
    }
  }, [displayBalance]);

  return {
    currentUserId,
    balance: displayBalance,
    wallet,
    loading,
    refresh: refreshCredits,
  };
}
