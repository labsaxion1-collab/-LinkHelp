import { useEffect, useState } from 'react';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { useAuth } from '@/context/AuthContext';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Database } from '@/types/supabase.database';
import type { LevelKey, UserType } from '@/gamification/types/gamification';
import { getCurrentLevelConfig } from '@/gamification/engines/levelEngine';
import {
  fetchGamificationMe,
  requestGamificationRecalculate,
} from '@/gamification/services/gamificationApiClient';
import type { UserGamificationRecord } from '@/gamification/services/gamificationService';

export interface UseGamificationResult {
  levelKey: LevelKey;
  heroKey: string;
  record: UserGamificationRecord | null;
  loading: boolean;
}

type ChannelEntry = {
  channel: RealtimeChannel;
  listeners: Set<() => void>;
  refCount: number;
};

const channelRegistry = new Map<string, ChannelEntry>();

function acquireGamificationChannel(
  db: SupabaseClient<Database>,
  userId: string,
  userType: UserType,
  onChange: () => void,
): () => void {
  const key = `user-gamification-${userId}-${userType}`;
  let entry = channelRegistry.get(key);

  if (!entry) {
    const listeners = new Set<() => void>();
    const channel = db
      .channel(key)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_gamification',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as { user_type?: string } | null;
          if (row?.user_type && row.user_type !== userType) return;
          listeners.forEach((listener) => listener());
        },
      )
      .subscribe();

    entry = { channel, listeners, refCount: 0 };
    channelRegistry.set(key, entry);
  }

  entry.listeners.add(onChange);
  entry.refCount += 1;

  return () => {
    const current = channelRegistry.get(key);
    if (!current) return;
    current.listeners.delete(onChange);
    current.refCount -= 1;
    if (current.refCount <= 0) {
      channelRegistry.delete(key);
      try {
        void db.removeChannel(current.channel);
      } catch {
        // Realtime pode já ter caído; nunca quebrar a UI por isso.
      }
    }
  };
}

/**
 * Gamificação do usuário autenticado para o papel dado.
 *
 * - Lê e recalcula via API (/api/gamification/me + /recalculate);
 * - Nunca faz upsert/update direto em user_gamification no navegador;
 * - Realtime dispara novo GET /me quando o snapshot muda no banco;
 * - Fallback seguro: sem sessão ou API indisponível → nível 'novo', sem erro na UI.
 */
export function useGamification(userType: UserType): UseGamificationResult {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [record, setRecord] = useState<UserGamificationRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setRecord(null);

    if (!userId || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    const db = getSupabase();
    if (!db) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const ensured = await fetchGamificationMe(userType);
        if (!cancelled) setRecord(ensured);

        const fresh = await requestGamificationRecalculate(userType);
        if (!cancelled && fresh) setRecord(fresh);
      } catch {
        // Fallback seguro: mantém estado atual.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const releaseChannel = acquireGamificationChannel(db, userId, userType, () => {
      fetchGamificationMe(userType)
        .then((next) => {
          if (!cancelled) setRecord(next);
        })
        .catch(() => undefined);
    });

    return () => {
      cancelled = true;
      releaseChannel();
    };
  }, [userId, userType]);

  const levelKey = record?.levelKey ?? 'novo';
  const heroKey = record?.heroKey ?? getCurrentLevelConfig(userType, 'novo').heroKey;

  return { levelKey, heroKey, record, loading };
}
