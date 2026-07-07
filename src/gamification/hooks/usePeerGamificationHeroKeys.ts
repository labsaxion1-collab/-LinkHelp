import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import type { UserType } from '@/gamification/types/gamification';

/** Lê hero_key de peers para exibir medalhas no chat (somente leitura). */
export function usePeerGamificationHeroKeys(peerIds: string[], peerUserType: UserType): Map<string, string> {
  const [heroKeys, setHeroKeys] = useState<Map<string, string>>(() => new Map());

  useEffect(() => {
    const unique = [...new Set(peerIds.filter(Boolean))];
    if (unique.length === 0) {
      setHeroKeys(new Map());
      return;
    }

    const sb = getSupabase();
    if (!sb) return;

    let cancelled = false;

    void (async () => {
      const { data, error } = await sb
        .from('user_gamification')
        .select('user_id, hero_key')
        .in('user_id', unique)
        .eq('user_type', peerUserType);

      if (cancelled) return;

      const next = new Map<string, string>();
      if (!error) {
        for (const row of data ?? []) {
          const heroKey = row.hero_key;
          if (row.user_id && heroKey) next.set(row.user_id, heroKey);
        }
      }
      setHeroKeys(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [peerIds.join(','), peerUserType]);

  return heroKeys;
}
