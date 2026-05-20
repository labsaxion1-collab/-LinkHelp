import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { useCredits } from '@/context/CreditContext';
import { isSupabaseConfigured } from '@/lib/supabase';
import {
  PROFILE_REWARD_CHECKS,
  type ProfileRewardCheckId,
  type RewardType,
} from '@/config/onboardingRewards';
import { grantUserReward } from '@/services/rewards/grantUserReward';
import {
  fetchUserBonusRewards,
  remoteEnsureSignupCredits,
} from '@/services/supabase/rewardsRemote';
import { formatLinkCredits } from '@/utils/formatLinkCredits';
import { fetchHelperSkills } from '@/services/supabase/helperSkillsRemote';
import { validatePhoneNumber, parseStoredPhone } from '@/utils/phoneFormat';

export type ProfileRewardSnapshot = {
  avatarUrl?: string | null;
  bio?: string | null;
  phone?: string | null;
  skillCount?: number;
};

export function useOnboardingRewards() {
  const { session, profile, refreshProfile } = useAuth();
  const { language, t } = useLanguage();
  const { showToast } = useToast();
  const { refreshCredits } = useCredits();
  const userId = session?.user?.id ?? profile?.id ?? '';
  const remote = isSupabaseConfigured() && Boolean(session);

  const [grantedTypes, setGrantedTypes] = useState<Set<RewardType>>(new Set());
  const [loadingRewards, setLoadingRewards] = useState(false);

  const reloadGranted = useCallback(async () => {
    if (!userId || !remote) {
      setGrantedTypes(new Set());
      return;
    }
    setLoadingRewards(true);
    try {
      const rows = await fetchUserBonusRewards(userId);
      setGrantedTypes(new Set(rows.map((r) => r.rewardType)));
    } finally {
      setLoadingRewards(false);
    }
  }, [userId, remote]);

  useEffect(() => {
    void reloadGranted();
  }, [reloadGranted]);

  useEffect(() => {
    if (!userId || !remote || !profile?.role) return;
    void remoteEnsureSignupCredits(userId, profile.role).then(() => {
      void reloadGranted();
      void refreshCredits();
      void refreshProfile();
    });
  }, [userId, remote, profile?.role, reloadGranted, refreshCredits, refreshProfile]);

  const notifyGrant = useCallback(
    (result: { granted: boolean; amount?: number; rewardType?: RewardType }, toastKey?: string) => {
      if (!result.granted || !result.amount) return;
      const amountLabel = formatLinkCredits(result.amount, language);
      if (toastKey) {
        showToast(t(toastKey, { amount: amountLabel }), 'success');
      } else {
        showToast(t('rewards.toast_added', { amount: amountLabel }), 'success');
      }
      if (result.rewardType) {
        setGrantedTypes((prev) => new Set([...prev, result.rewardType!]));
      }
    },
    [language, showToast, t],
  );

  const tryGrant = useCallback(
    async (rewardType: RewardType, description?: string, toastKey?: string) => {
      if (!userId) return { granted: false as const };
      if (grantedTypes.has(rewardType)) return { granted: false as const, reason: 'ALREADY_GRANTED' };

      const result = await grantUserReward(userId, rewardType, { description });
      notifyGrant(result, toastKey);
      if (result.granted) {
        await Promise.all([refreshCredits(), refreshProfile()]);
        await reloadGranted();
      }
      return result;
    },
    [userId, grantedTypes, notifyGrant, refreshCredits, refreshProfile, reloadGranted],
  );

  const evaluateProfileRewards = useCallback(
    async (snapshot: ProfileRewardSnapshot) => {
      if (!userId) return;

      let skillCount = snapshot.skillCount;
      if (skillCount === undefined && profile?.role === 'helper' && remote) {
        const keys = await fetchHelperSkills(userId);
        skillCount = keys.length;
      }

      if (snapshot.avatarUrl?.trim()) {
        await tryGrant('PROFILE_PHOTO', undefined, 'rewards.toast_profile_photo');
      }
      if (snapshot.bio?.trim()) {
        await tryGrant('PROFILE_DESCRIPTION', undefined, 'rewards.toast_profile_bio');
      }
      if (profile?.role === 'helper' && (skillCount ?? 0) >= 1) {
        await tryGrant('PROFILE_SKILLS', undefined, 'rewards.toast_profile_skills');
      }
      if (snapshot.phone?.trim()) {
        const { countryId, nationalNumber } = parseStoredPhone(snapshot.phone);
        const phoneValidation = validatePhoneNumber(countryId, nationalNumber);
        if (phoneValidation.valid) {
          await tryGrant('PHONE_VERIFIED', undefined, 'rewards.toast_phone');
        }
      }
    },
    [userId, profile?.role, remote, tryGrant],
  );

  const profileChecks = useMemo(() => {
    const isHelper = profile?.role === 'helper';
    const checks = isHelper
      ? PROFILE_REWARD_CHECKS
      : PROFILE_REWARD_CHECKS.filter((c) => c.id !== 'PROFILE_SKILLS');
    const hasPhoto = Boolean(profile?.avatar_url?.trim());
    const hasBio = Boolean(profile?.bio?.trim());
    const hasPhone = Boolean(profile?.phone?.trim());
    return checks.map((check) => {
      const granted = grantedTypes.has(check.rewardType);
      let done = granted;
      if (!done) {
        if (check.id === 'PROFILE_PHOTO') done = hasPhoto;
        if (check.id === 'PROFILE_DESCRIPTION') done = hasBio;
        if (check.id === 'PHONE_VERIFIED') done = hasPhone;
        if (check.id === 'PROFILE_SKILLS') done = false;
      }
      return { ...check, done, granted };
    });
  }, [profile?.avatar_url, profile?.bio, profile?.phone, profile?.role, grantedTypes]);

  const profilePercent = useMemo(() => {
    const total = profileChecks.length;
    if (!total) return 0;
    const done = profileChecks.filter((c) => c.done || c.granted).length;
    return Math.round((done / total) * 100);
  }, [profileChecks]);

  const isCheckGranted = useCallback(
    (id: ProfileRewardCheckId) => grantedTypes.has(id),
    [grantedTypes],
  );

  return {
    grantedTypes,
    loadingRewards,
    profileChecks,
    profilePercent,
    isCheckGranted,
    tryGrant,
    evaluateProfileRewards,
    reloadGranted,
  };
}
