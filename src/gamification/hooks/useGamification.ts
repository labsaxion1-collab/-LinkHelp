import { useEffect, useState } from 'react';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { useAuth } from '@/context/AuthContext';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Database } from '@/types/supabase.database';
import type { LevelKey, UserType } from '@/gamification/types/gamification';
import { getCurrentLevelConfig } from '@/gamification/engines/levelEngine';
import {
  ensureUserGamification,
  getUserGamification,
  recalculateUserGamification,
  type UserGamificationRecord,
} from '@/gamification/services/gamificationService';

export interface UseGamificationResult {
  levelKey: LevelKey;
  heroKey: string;
  record: UserGamificationRecord | null;
  loading: boolean;
}

/**
 * Registry module-level: garante UMA assinatura realtime por userId+userType,
 * mesmo com vários componentes usando o hook ao mesmo tempo (hero + card).
 *
 * Motivo: `supabase.channel(nome)` reutiliza o canal se o tópico já existe.
 * Um segundo `.on('postgres_changes')` após `.subscribe()` dispara
 * "cannot add postgres_changes callbacks after subscribe()".
 */
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
    // Ordem obrigatória: .channel() → .on() → .subscribe(). Nunca .on() depois.
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
        () => {
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
 * - Garante o registro em `user_gamification` (cria zerado se não existe);
 * - Recalcula em background com os dados reais do banco;
 * - Assina realtime (compartilhado): quando `level_key`/`hero_key` muda no
 *   banco, o record muda e a hero troca junto;
 * - Fallback seguro: sem sessão, sem Supabase, sem tabela ou realtime fora
 *   do ar → mantém o estado atual (nível 'novo' por padrão), sem erro na UI.
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
        const ensured = await ensureUserGamification(db, userId, userType);
        if (!cancelled && ensured) setRecord(ensured);

        const fresh = await recalculateUserGamification(db, userId, userType);
        if (!cancelled && fresh) setRecord(fresh);
      } catch {
        // Fallback seguro: mantém estado atual.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const releaseChannel = acquireGamificationChannel(db, userId, userType, () => {
      getUserGamification(db, userId, userType)
        .then((next) => {
          if (!cancelled && next) setRecord(next);
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
