import { usePublicProfileExtras } from '@/hooks/usePublicProfileExtras';

/** Read-only fetch of profiles.spoken_languages for public candidate accordion. */
export function useHelperSpokenLanguages(helperId: string | null | undefined, enabled = true) {
  const { spokenLanguages, loading } = usePublicProfileExtras(helperId, enabled);
  return { languages: spokenLanguages, loading };
}
