import type { HelperCompletionBreakdown } from '@/utils/helperProfileCompletion';

/** Translation keys — pick first N in UI for smart tips. */
export function helperProfileSuggestionKeys(breakdown: HelperCompletionBreakdown): string[] {
  const keys: string[] = [];
  if (!breakdown.portfolioVideo) keys.push('helper_profile_completion.suggest_video');
  if (!breakdown.portfolioPhoto) keys.push('helper_profile_completion.suggest_photo_trust');
  if (!breakdown.verified) keys.push('helper_profile_completion.suggest_verify');
  if (!breakdown.skillsSelected) keys.push('helper_profile_completion.suggest_skills');
  if (!breakdown.profilePhoto) keys.push('helper_profile_completion.suggest_avatar');
  return keys.slice(0, 3);
}
