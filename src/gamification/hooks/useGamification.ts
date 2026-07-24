import { useEffect, useSyncExternalStore } from 'react';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { useAuth } from '@/context/AuthContext';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Database } from '@/types/supabase.database';
import type { LevelKey, UserType } from '@/gamification/types/gamification';
import {
  fetchGamificationMe,
} from '@/gamification/services/gamificationApiClient';
import {
  isGamificationRecordForUser,
  normalizeGamificationRecordUserId,
  scheduleGamificationRecalculate,
} from '@/gamification/hero/gamificationBackgroundRecalculate';
import {
  acquireGamificationHookEffect,
  beginGamificationSession,
  clearGamificationInflight,
  commitGamificationError,
  commitGamificationRealtime,
  commitGamificationSuccess,
  getGamificationSnapshot,
  getLoggedOutGamificationSnapshot,
  getReusableGamificationGeneration,
  isGamificationGenerationCurrent,
  markGamificationInflight,
  subscribeGamification,
  type GamificationSnapshot,
} from '@/gamification/state/gamificationUserStore';
import { recordRealtimeChannelCreated, recordRealtimeChannelRemoved, recordRealtimeEvent, recordRealtimeSubscriptionStatus } from '@/lib/dev/supabaseMetrics';

export interface UseGamificationResult {
  levelKey: LevelKey | null;
  heroKey: string | null;
  record: GamificationSnapshot['record'];
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
 * Estado compartilhado por userId+userType (uma carga por sessão na Home).
 * Respostas atrasadas de outra geração ou conta não atualizam o snapshot.
 */
export function useGamification(userType: UserType): UseGamificationResult {
  const { user, sessionConfirmed } = useAuth();
  const userId = sessionConfirmed ? (user?.id ?? null) : null;

  const snapshot = useSyncExternalStore(
    (onStoreChange) => {
      if (!userId) return () => {};
      return subscribeGamification(userId, userType, onStoreChange);
    },
    () =>
      userId ? getGamificationSnapshot(userId, userType) : getLoggedOutGamificationSnapshot(userType),
    () => getLoggedOutGamificationSnapshot(userType),
  );

  useEffect(() => {
    if (!userId || !isSupabaseConfigured()) return;
    const db = getSupabase();
    if (!db) return;

    const { isPrimary, release: releaseEffect } = acquireGamificationHookEffect(userId, userType);
    let cancelled = false;
    let generation = 0;

    const releaseChannel = acquireGamificationChannel(db, userId, userType, () => {
      void fetchGamificationMe(userType)
        .then((next) => {
          commitGamificationRealtime(userId, userType, next);
        })
        .catch(() => undefined);
    });

    if (isPrimary) {
      const reusable = getReusableGamificationGeneration(userId, userType);
      if (reusable !== null) {
        generation = reusable;
      } else {
        generation = beginGamificationSession(userId, userType);
        markGamificationInflight(userId, userType, generation);

        void (async () => {
          try {
            const ensured = await fetchGamificationMe(userType);
            if (cancelled || !isGamificationGenerationCurrent(userId, userType, generation)) return;
            if (!isGamificationRecordForUser(ensured, userId, userType)) {
              if (!getGamificationSnapshot(userId, userType).record) {
                commitGamificationError(userId, userType, generation);
              }
              return;
            }
            const record = normalizeGamificationRecordUserId(ensured, userId);
            commitGamificationSuccess(userId, userType, generation, record);
            scheduleGamificationRecalculate(userId, userType, generation);
          } catch {
            if (cancelled || !isGamificationGenerationCurrent(userId, userType, generation)) return;
            if (!getGamificationSnapshot(userId, userType).record) {
              commitGamificationError(userId, userType, generation);
            }
          } finally {
            clearGamificationInflight(userId, userType, generation);
          }
        })();
      }
    }

    return () => {
      cancelled = true;
      releaseEffect();
      releaseChannel();
    };
  }, [userId, userType]);

  const levelKey = snapshot.record?.levelKey ?? null;
  const heroKey = snapshot.record?.heroKey ?? null;
  const isResolved = !snapshot.loading;

  return {
    levelKey,
    heroKey,
    record: snapshot.record,
    loading: snapshot.loading,
    error: snapshot.error,
    isResolved,
  };
}
