import type { HelperProfileSettings } from '@/utils/helperProfileSettings';

export interface HelperCompletionBreakdown {
  profilePhoto: boolean;
  skillsSelected: boolean;
  percent: number;
}

const WEIGHT = {
  profilePhoto: 50,
  skillsSelected: 50,
} as const;

export function computeHelperProfileCompletion(
  profile: HelperProfileSettings,
  avatarUrl?: string | null,
): HelperCompletionBreakdown {
  const profilePhoto = Boolean(avatarUrl?.trim() || profile.avatarDataUrl?.trim());
  const skillsSelected = profile.skillIds.length >= 1;

  let percent = 0;
  if (profilePhoto) percent += WEIGHT.profilePhoto;
  if (skillsSelected) percent += WEIGHT.skillsSelected;

  return {
    profilePhoto,
    skillsSelected,
    percent: Math.min(100, percent),
  };
}

export type CompletionRowKey = keyof Omit<HelperCompletionBreakdown, 'percent'>;
