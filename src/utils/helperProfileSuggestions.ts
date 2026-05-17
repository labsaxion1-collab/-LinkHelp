import type { HelperCompletionBreakdown } from '@/utils/helperProfileCompletion';

/** Translation keys — pick first N in UI for smart tips. */
export function helperProfileSuggestionKeys(breakdown: HelperCompletionBreakdown): string[] {
  const keys: string[] = [];
  if (!breakdown.profilePhoto) keys.push('helper_profile_completion.suggest_avatar');
  if (!breakdown.skillsSelected) keys.push('helper_profile_completion.suggest_skills');
  return keys.slice(0, 3);
}
