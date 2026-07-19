import { useEffect, useState } from 'react';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

/** Read-only fetch of profiles.spoken_languages for public candidate accordion. */
export function useHelperSpokenLanguages(helperId: string | null | undefined, enabled = true) {
  const [languages, setLanguages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !helperId || !isSupabaseConfigured()) {
      setLanguages([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const sb = getSupabase();
        const { data } = await sb
          .from('profiles')
          .select('spoken_languages')
          .eq('id', helperId)
          .maybeSingle();
        if (cancelled) return;
        const raw = data?.spoken_languages;
        setLanguages(Array.isArray(raw) ? raw.filter(Boolean) : []);
      } catch {
        if (!cancelled) setLanguages([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [helperId, enabled]);

  return { languages, loading };
}
