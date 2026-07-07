import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  getGamificationMeForUser,
  recalculateGamificationForUser,
  resolveGamificationUser,
  toGamificationApiResponse,
  validateUserTypeForProfile,
} from '@/gamification/services/recalculateGamification';
import type { GamificationDb } from '@/gamification/services/gamificationStatsAdapter';
import type { UserGamificationRecord } from '@/gamification/services/gamificationService';

const USER_ID = 'user-1';

type Seed = {
  profile?: { id: string; role: string };
  gamification?: Array<Record<string, unknown>>;
  applications?: Array<{ helper_id: string; status: string }>;
  requests?: Array<{ client_id: string; status: string }>;
};

function createServerMockDb(seed: Seed = {}) {
  const gamificationStore = new Map<string, Record<string, unknown>>();
  const storeKey = (userId: string, userType: string) => `${userId}:${userType}`;

  class MockQuery {
    private filters: Record<string, unknown> = {};
    private statuses: string[] | null = null;
    private inFilters: Record<string, unknown[]> = {};
    private upserted: Record<string, unknown> | null = null;

    constructor(private table: string) {}

    select() {
      return this;
    }

    eq(column: string, value: unknown) {
      this.filters[column] = value;
      return this;
    }

    in(column: string, values: unknown[]) {
      if (column === 'status') {
        this.statuses = values as string[];
      } else {
        this.inFilters[column] = values;
      }
      return this;
    }

    upsert(payload: Record<string, unknown>) {
      const userId = payload.user_id as string;
      const userType = payload.user_type as string;
      const key = storeKey(userId, userType);
      const existing = gamificationStore.get(key);
      const row = {
        id: existing?.id ?? `row-${gamificationStore.size + 1}`,
        ...(existing ?? {}),
        ...payload,
      };
      gamificationStore.set(key, row);
      this.upserted = row;
      return this;
    }

    async maybeSingle() {
      if (this.upserted) {
        return { data: this.upserted, error: null };
      }

      if (this.table === 'user_gamification') {
        const key = storeKey(String(this.filters.user_id), String(this.filters.user_type));
        const row = gamificationStore.get(key);
        return { data: row ?? null, error: null };
      }

      if (this.table === 'profiles') {
        const match = seed.profile && seed.profile.id === this.filters.id ? seed.profile : null;
        return { data: match, error: null };
      }

      return { data: null, error: null };
    }

    then<T>(onFulfilled: (value: { count?: number; data?: unknown[]; error: null }) => T) {
      let rows: Array<Record<string, unknown>> = [];
      if (this.table === 'applications') rows = seed.applications ?? [];
      if (this.table === 'requests') rows = seed.requests ?? [];
      if (this.table === 'conversations') rows = [];
      if (this.table === 'messages') rows = [];
      if (this.table === 'user_complaints') rows = [];

      const filtered = rows.filter((row) => {
        for (const [column, value] of Object.entries(this.filters)) {
          if (row[column] !== value) return false;
        }
        if (this.statuses && !this.statuses.includes(String(row.status))) return false;
        for (const [column, values] of Object.entries(this.inFilters)) {
          if (!values.includes(row[column])) return false;
        }
        return true;
      });

      if (this.table === 'conversations' || this.table === 'messages') {
        return Promise.resolve({ data: filtered, error: null }).then(onFulfilled);
      }

      return Promise.resolve({ count: filtered.length, error: null }).then(onFulfilled);
    }
  }

  return {
    db: {
      from(table: string) {
        return new MockQuery(table);
      },
    } as unknown as GamificationDb,
    gamificationStore,
  };
}

describe('resolveGamificationUser — segurança da API', () => {
  it('API sem token retorna AUTH_REQUIRED', async () => {
    const { db } = createServerMockDb();
    const result = await resolveGamificationUser(db, null, 'helper');
    expect(result).toEqual({ error: 'AUTH_REQUIRED', status: 401 });
  });

  it('userType inválido retorna INVALID_USER_TYPE', async () => {
    const { db } = createServerMockDb({
      profile: { id: USER_ID, role: 'helper' },
    });
    const result = await resolveGamificationUser(db, USER_ID, 'admin');
    expect(result).toEqual({ error: 'INVALID_USER_TYPE', status: 400 });
  });

  it('usuário não consegue recalcular com userType diferente do profile', async () => {
    const { db } = createServerMockDb({
      profile: { id: USER_ID, role: 'helper' },
    });
    const result = await resolveGamificationUser(db, USER_ID, 'client');
    expect(result).toEqual({ error: 'FORBIDDEN_USER_TYPE', status: 403 });
  });

  it('aceita userType quando bate com profiles.role', async () => {
    const { db } = createServerMockDb({
      profile: { id: USER_ID, role: 'helper' },
    });
    const result = await resolveGamificationUser(db, USER_ID, 'helper');
    expect(result).toEqual({ userId: USER_ID, userType: 'helper' });
  });
});

describe('validateUserTypeForProfile', () => {
  it('rejeita mismatch entre token user e userType pedido', async () => {
    const { db } = createServerMockDb({
      profile: { id: USER_ID, role: 'client' },
    });
    await expect(validateUserTypeForProfile(db, USER_ID, 'helper')).resolves.toBe(false);
  });
});

describe('recalculateGamificationForUser — gravação server-side', () => {
  it('recálculo grava no banco via backend (service role mock)', async () => {
    const { db, gamificationStore } = createServerMockDb({
      profile: { id: USER_ID, role: 'helper' },
      applications: [
        { helper_id: USER_ID, status: 'completed' },
        { helper_id: USER_ID, status: 'pending' },
      ],
    });

    const payload = await recalculateGamificationForUser(db, USER_ID, 'helper');

    expect(payload).not.toBeNull();
    expect(payload!.userId).toBe(USER_ID);
    expect(payload!.score).toBeGreaterThan(0);
    expect(gamificationStore.size).toBe(1);
    expect(gamificationStore.get(`${USER_ID}:helper`)?.level_key).toBeTruthy();
  });

  it('GET me garante registro sem depender do front', async () => {
    const { db, gamificationStore } = createServerMockDb({
      profile: { id: USER_ID, role: 'client' },
    });

    const payload = await getGamificationMeForUser(db, USER_ID, 'client');

    expect(payload).not.toBeNull();
    expect(payload!.levelKey).toBe('novo');
    expect(gamificationStore.size).toBe(1);
  });
});

describe('toGamificationApiResponse', () => {
  it('inclui nível atual e próximo nível', () => {
    const record: UserGamificationRecord = {
      userId: USER_ID,
      userType: 'helper',
      score: 120,
      levelKey: 'confiavel',
      heroKey: 'helper_confiavel',
      stats: {
        totalCompleted: 0,
        avgRating: 0,
        responseRate: 0,
        cancelCount: 0,
        complaintCount: 0,
        profilePct: 90,
        applicationsCount: 1,
        publishedOrdersCount: 0,
        hireRate: 0,
      },
      progressPercent: 8,
      pointsToNextLevel: 130,
      missingRequirements: ['3 serviço(s) restante(s)'],
      updatedAt: '2026-07-06T00:00:00.000Z',
    };

    const response = toGamificationApiResponse(record);
    expect(response.currentLevel.key).toBe('confiavel');
    expect(response.nextLevel?.key).toBe('profissional');
  });
});

describe('useGamification — sem escrita direta', () => {
  it('hook não importa funções de upsert direto em user_gamification', async () => {
    const source = await readFile(
      resolve('src/gamification/hooks/useGamification.ts'),
      'utf8',
    );

    expect(source).not.toContain('ensureUserGamification');
    expect(source).not.toContain('recalculateUserGamification');
    expect(source).not.toContain('getUserGamification');
    expect(source).not.toContain('.upsert');
    expect(source).toContain('fetchGamificationMe');
    expect(source).toContain('requestGamificationRecalculate');
  });
});
