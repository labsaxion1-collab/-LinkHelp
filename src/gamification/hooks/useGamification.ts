import { useEffect, useState } from 'react';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { useAuth } from '@/context/AuthContext';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Database } from '@/types/supabase.database';
import type { LevelKey, UserType } from '@/gamification/types/gamification';
import {
  fetchGamificationMe,
  requestGamificationRecalculate,
} from '@/gamification/services/gamificationApiClient';
import type { UserGamificationRecord } from '@/gamification/services/gamificationService';
import { recordRealtimeChannelCreated, recordRealtimeChannelRemoved, recordRealtimeEvent, recordRealtimeSubscriptionStatus } from '@/lib/dev/supabaseMetrics';

export interface UseGamificationResult {
  levelKey: LevelKey | null;
  heroKey: string | null;
  record: UserGamificationRecord | null;
  loading: boolean;
  error: boolean;
  isResolved: boolean;
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
    const logicalName = 'gamification-user-type';
    recordRealtimeChannelCreated({ channelName: logicalName, tables: ['user_gamification'], filters: ['user_id=eq.[redacted]'], listenerCount: 1 });
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
          recordRealtimeEvent('gamification-user-type', 'user_gamification', payload.eventType ?? 'UNKNOWN');
          listeners.forEach((listener) => listener());
        },
      )
      .subscribe((status) => recordRealtimeSubscriptionStatus('gamification-user-type', status));

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
        recordRealtimeChannelRemoved('gamification-user-type');
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
 * - Fallback seguro: sem sessão → estado resolvido vazio; falha de API → error, sem nível presumido.
 */
export function useGamification(userType: UserType): UseGamificationResult {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [record, setRecord] = useState<UserGamificationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setRecord(null);
    setError(false);
    setLoading(true);

    if (!userId || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    const db = getSupabase();
    if (!db) {
      setLoading(false);
      setError(true);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const ensured = await fetchGamificationMe(userType);
        let resolved = ensured;
        const fresh = await requestGamificationRecalculate(userType);
        if (fresh) resolved = fresh;
        if (!cancelled) setRecord(resolved);
      } catch {
        if (!cancelled) {
          setError(true);
          setRecord(null);
        }
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

  const levelKey = record?.levelKey ?? null;
  const heroKey = record?.heroKey ?? null;
  const isResolved = !loading;

  return { levelKey, heroKey, record, loading, error, isResolved };
}
