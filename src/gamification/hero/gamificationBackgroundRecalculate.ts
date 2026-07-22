import type { UserType } from '@/gamification/types/gamification';
import type { UserGamificationRecord } from '@/gamification/services/gamificationService';
import { requestGamificationRecalculate } from '@/gamification/services/gamificationApiClient';
import {
  commitGamificationSuccess,
  gamificationStoreKey,
  isGamificationGenerationCurrent,
} from '@/gamification/state/gamificationUserStore';
import { heroPerfMark } from '@/gamification/hero/heroPerformance';

const recalculateInflight = new Map<string, Promise<void>>();

export function isGamificationRecordForUser(
  record: UserGamificationRecord,
  userId: string,
  userType: UserType,
): boolean {
  if (record.userType !== userType) return false;
  if (record.userId && record.userId !== userId) return false;
  return true;
}

export function normalizeGamificationRecordUserId(
  record: UserGamificationRecord,
  userId: string,
): UserGamificationRecord {
  if (record.userId === userId) return record;
  return { ...record, userId };
}

/**
 * Recalculate em background — uma inflight por userId:userType.
 * Atualiza a store só se generation/conta ainda forem válidos.
 */
export function scheduleGamificationRecalculate(
  userId: string,
  userType: UserType,
  generation: number,
): void {
  const key = gamificationStoreKey(userId, userType);
  if (recalculateInflight.has(key)) return;

  heroPerfMark('recalculate-start', userType);

  const task = (async () => {
    try {
      const fresh = await requestGamificationRecalculate(userType);
      if (!isGamificationGenerationCurrent(userId, userType, generation)) return;
      if (!fresh) return;
      if (!isGamificationRecordForUser(fresh, userId, userType)) return;
      commitGamificationSuccess(
        userId,
        userType,
        generation,
        normalizeGamificationRecordUserId(fresh, userId),
      );
      heroPerfMark('recalculate-ready', userType);
    } catch {
      // Mantém record do `me` — falha silenciosa.
    } finally {
      recalculateInflight.delete(key);
    }
  })();

  recalculateInflight.set(key, task);
}

/** Test-only */
export function resetGamificationRecalculateInflightForTests(): void {
  recalculateInflight.clear();
}

/** Test-only */
export function getGamificationRecalculateInflightCount(): number {
  return recalculateInflight.size;
}
