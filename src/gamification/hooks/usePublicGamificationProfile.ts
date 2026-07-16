import { useEffect, useMemo, useRef, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import type { UserType } from '@/gamification/types/gamification';

export type PublicGamificationProfile = {
  userId: string;
  userType: UserType;
  heroKey: string | null;
};

type PublicGamificationRow = {
  user_id?: string | null;
  user_type?: string | null;
  hero_key?: string | null;
};

type CacheEntry = { value: PublicGamificationProfile | null; expiresAt: number };

const CACHE_TTL_MS = 60_000;
const profileCache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<PublicGamificationProfile | null>>();

function cacheKey(userId: string, userType: UserType): string {
  return `${userType}:${userId}`;
}

function normalizeProfile(row: PublicGamificationRow | null | undefined): PublicGamificationProfile | null {
  if (!row?.user_id) return null;
  if (row.user_type !== 'client' && row.user_type !== 'helper') return null;
  return {
    userId: row.user_id,
    userType: row.user_type,
    heroKey: row.hero_key ?? null,
  };
}

async function fetchPublicGamificationProfile(
  targetUserId: string,
  targetUserType: UserType,
): Promise<PublicGamificationProfile | null> {
  const key = cacheKey(targetUserId, targetUserType);
  const cached = profileCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const existing = inFlight.get(key);
  if (existing) return existing;

  const sb = getSupabase();
  if (!sb) return null;

  const promise = (async () => {
    const { data, error } = await sb.rpc('get_public_gamification_profile', {
      target_user_id: targetUserId,
      target_user_type: targetUserType,
    });

    if (error) return null;
    const row = Array.isArray(data) ? (data[0] as PublicGamificationRow | undefined) : (data as PublicGamificationRow | null);
    const value = normalizeProfile(row);
    profileCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    return value;
  })().finally(() => {
    inFlight.delete(key);
  });

  inFlight.set(key, promise);
  return promise;
}

export function usePublicGamificationProfiles(
  targetUserIds: string[],
  targetUserType: UserType,
): {
  profiles: Map<string, PublicGamificationProfile>;
  loading: boolean;
  error: boolean;
} {
  const stableIds = useMemo(
    () => [...new Set(targetUserIds.filter(Boolean))].sort(),
    [targetUserIds.join(',')],
  );
  const [profiles, setProfiles] = useState<Map<string, PublicGamificationProfile>>(() => new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const requestSeq = useRef(0);

  useEffect(() => {
    requestSeq.current += 1;
    const seq = requestSeq.current;

    if (stableIds.length === 0) {
      setProfiles(new Map());
      setLoading(false);
      setError(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);

    void Promise.all(stableIds.map((id) => fetchPublicGamificationProfile(id, targetUserType)))
      .then((rows) => {
        if (cancelled || seq !== requestSeq.current) return;
        const next = new Map<string, PublicGamificationProfile>();
        for (const row of rows) {
          if (row) next.set(row.userId, row);
        }
        setProfiles(next);
      })
      .catch(() => {
        if (!cancelled && seq === requestSeq.current) setError(true);
      })
      .finally(() => {
        if (!cancelled && seq === requestSeq.current) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [stableIds.join(','), targetUserType]);

  return { profiles, loading, error };
}

export function usePublicGamificationHeroKeys(peerIds: string[], peerUserType: UserType): Map<string, string> {
  const { profiles } = usePublicGamificationProfiles(peerIds, peerUserType);
  return useMemo(() => {
    const next = new Map<string, string>();
    for (const [userId, profile] of profiles) {
      if (profile.heroKey) next.set(userId, profile.heroKey);
    }
    return next;
  }, [profiles]);
}
