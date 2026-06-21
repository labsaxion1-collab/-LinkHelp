import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { remoteCompleteClientOnboarding } from '@/services/supabase/clientOnboardingRemote';
import { getClientDeviceFingerprint } from '@/utils/clientDeviceFingerprint';
import type { CompleteClientOnboardingResult } from '@/types/clientOnboarding';

export type ClientOnboardingCompleteAction = 'explore' | 'createRequest';

export function useClientOnboarding() {
  const { profile, authLoading, refreshProfile } = useAuth();
  const [completing, setCompleting] = useState(false);
  const [localCompleted, setLocalCompleted] = useState(false);

  const shouldShow = useMemo(() => {
    if (authLoading || localCompleted) return false;
    if (profile?.role !== 'client') return false;
    return !profile.client_onboarding_completed_at;
  }, [authLoading, localCompleted, profile?.role, profile?.client_onboarding_completed_at]);

  const complete = useCallback(
    async (_action: ClientOnboardingCompleteAction): Promise<CompleteClientOnboardingResult | null> => {
      if (!profile?.id || completing) return null;
      setCompleting(true);
      try {
        const result = await remoteCompleteClientOnboarding(profile.id, getClientDeviceFingerprint());
        await refreshProfile();
        setLocalCompleted(true);
        return result;
      } finally {
        setCompleting(false);
      }
    },
    [completing, profile?.id, refreshProfile],
  );

  return { shouldShow, completing, complete };
}
