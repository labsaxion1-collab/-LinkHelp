/** Persisted helper profile data for completion scoring & onboarding (demo — swap for API). */

import { filterValidSkillKeys } from '@/data/helperSkillsCatalog';

export const HELPER_PROFILE_STORAGE_KEY = 'linkhelp_helper_profile_v1';

export type VerificationStatus = 'none' | 'pending' | 'verified';

export interface HelperProfileSettings {
  /** Custom avatar — profile strength counts only when set. */
  avatarDataUrl: string | null;
  /** Selected subcategory keys (`primary:sub`) from helper skills catalog */
  skillIds: string[];
  /** Demo stand-in for “reviews received” until jobs API exists */
  reviewCount: number;
  verificationStatus: VerificationStatus;
}

const defaults = (): HelperProfileSettings => ({
  avatarDataUrl: null,
  skillIds: [],
  reviewCount: 0,
  verificationStatus: 'none',
});

export function loadHelperProfileSettings(): HelperProfileSettings {
  try {
    const raw = localStorage.getItem(HELPER_PROFILE_STORAGE_KEY);
    if (!raw) return defaults();
    const p = JSON.parse(raw) as Partial<HelperProfileSettings>;
    return {
      avatarDataUrl: typeof p.avatarDataUrl === 'string' ? p.avatarDataUrl : null,
      skillIds: filterValidSkillKeys(
        Array.isArray(p.skillIds) ? p.skillIds.filter((x): x is string => typeof x === 'string') : [],
      ),
      reviewCount: typeof p.reviewCount === 'number' && p.reviewCount >= 0 ? p.reviewCount : 0,
      verificationStatus:
        p.verificationStatus === 'pending' || p.verificationStatus === 'verified' || p.verificationStatus === 'none'
          ? p.verificationStatus
          : 'none',
    };
  } catch {
    return defaults();
  }
}

export function saveHelperProfileSettings(s: HelperProfileSettings): void {
  localStorage.setItem(HELPER_PROFILE_STORAGE_KEY, JSON.stringify(s));
}
