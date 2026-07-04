import { describe, expect, it } from 'vitest';
import type { UserGamificationRow } from '@/types/database';
import type { GamificationStats } from '@/gamification/types/gamification';
import {
  ensureUserGamification,
  getUserGamification,
  getUserProgress,
  recalculateUserGamification,
  updateUserGamification,
} from '@/gamification/services/gamificationService';
import type { GamificationDb } from '@/gamification/services/gamificationStatsAdapter';

type SeedProfile = {
  id: string;
  rating: number | null;
  avatar_url: string | null;
  name: string | null;
  phone: string | null;
  city: string | null;
  bio: string | null;
};

type Seed = {
  profile?: SeedProfile;
  applications?: Array<{ helper_id: string; status: string }>;
  requests?: Array<{ client_id: string; status: string }>;
};

/** Mock em memória cobrindo as queries usadas pelo service e pelo adapter. */
function createMockDb(seed: Seed = {}) {
  const gamificationStore = new Map<string, UserGamificationRow>();

  const storeKey = (userId: string, userType: string) => `${userId}:${userType}`;

  class MockQuery {
    private filters: Record<string, unknown> = {};
    private statuses: string[] | null = null;
    private upserted: Record<string, unknown> | null = null;

    constructor(private table: string) {}

    select() {
      return this;
    }

    eq(column: string, value: unknown) {
      this.filters[column] = value;
      return this;
    }

    in(_column: string, values: string[]) {
      this.statuses = values;
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
      } as UserGamificationRow;
      gamificationStore.set(key, row);
      this.upserted = row as unknown as Record<string, unknown>;
      return this;
    }

    async maybeSingle() {
      if (this.upserted) return { data: this.upserted, error: null };

      if (this.table === 'user_gamification') {
        const key = storeKey(String(this.filters.user_id), String(this.filters.user_type));
        return { data: gamificationStore.get(key) ?? null, error: null };
      }

      if (this.table === 'profiles') {
        const match = seed.profile && seed.profile.id === this.filters.id ? seed.profile : null;
        return { data: match, error: null };
      }

      return { data: null, error: null };
    }

    /** Torna a query "awaitable" para as contagens do adapter. */
    then<T>(onFulfilled: (value: { count: number; error: null }) => T) {
      let rows: Array<Record<string, unknown>> = [];
      if (this.table === 'applications') rows = seed.applications ?? [];
      if (this.table === 'requests') rows = seed.requests ?? [];

      const filtered = rows.filter((row) => {
        for (const [column, value] of Object.entries(this.filters)) {
          if (row[column] !== value) return false;
        }
        if (this.statuses && !this.statuses.includes(String(row.status))) return false;
        return true;
      });

      return Promise.resolve({ count: filtered.length, error: null }).then(onFulfilled);
    }
  }

  const db = {
    from(table: string) {
      return new MockQuery(table);
    },
  };

  return db as unknown as GamificationDb;
}

const HELPER_ID = 'helper-1';
const CLIENT_ID = 'client-1';

const fullProfile: SeedProfile = {
  id: HELPER_ID,
  rating: 4.8,
  avatar_url: 'https://x/avatar.png',
  name: 'Helper Teste',
  phone: '+1 555',
  city: 'Montreal',
  bio: 'bio',
};

describe('ensureUserGamification — criação inicial', () => {
  it('cria registro zerado com level novo e hero inicial', async () => {
    const db = createMockDb();
    const record = await ensureUserGamification(db, HELPER_ID, 'helper');

    expect(record).not.toBeNull();
    expect(record!.score).toBe(0);
    expect(record!.levelKey).toBe('novo');
    expect(record!.heroKey).toBe('helper_novo');
    expect(record!.stats.totalCompleted).toBe(0);
    expect(record!.pointsToNextLevel).toBe(100);
  });

  it('cliente inicial recebe hero client_novo', async () => {
    const db = createMockDb();
    const record = await ensureUserGamification(db, CLIENT_ID, 'client');
    expect(record!.heroKey).toBe('client_novo');
  });

  it('não sobrescreve registro existente', async () => {
    const db = createMockDb();
    const stats: GamificationStats = {
      totalCompleted: 3,
      avgRating: 4.5,
      responseRate: 70,
      cancelCount: 0,
      complaintCount: 0,
      profilePct: 100,
      applicationsCount: 5,
      publishedOrdersCount: 0,
      hireRate: 50,
    };
    const updated = await updateUserGamification(db, HELPER_ID, 'helper', stats);
    const ensured = await ensureUserGamification(db, HELPER_ID, 'helper');

    expect(ensured!.score).toBe(updated!.score);
    expect(ensured!.levelKey).toBe(updated!.levelKey);
  });
});

describe('recalculateUserGamification — helper', () => {
  it('monta stats das tabelas reais e atualiza snapshot', async () => {
    const db = createMockDb({
      profile: fullProfile,
      applications: [
        { helper_id: HELPER_ID, status: 'completed' },
        { helper_id: HELPER_ID, status: 'completed' },
        { helper_id: HELPER_ID, status: 'accepted' },
        { helper_id: HELPER_ID, status: 'pending' },
      ],
    });

    const record = await recalculateUserGamification(db, HELPER_ID, 'helper');

    expect(record).not.toBeNull();
    expect(record!.stats.applicationsCount).toBe(4);
    expect(record!.stats.totalCompleted).toBe(2);
    expect(record!.stats.avgRating).toBe(4.8);
    expect(record!.stats.profilePct).toBe(100);
    expect(record!.stats.hireRate).toBe(75);
    expect(record!.score).toBeGreaterThan(0);
    // Requisitos gate: sem responseRate real ainda, não passa de confiável.
    expect(record!.levelKey).toBe('confiavel');
    expect(record!.heroKey).toBe('helper_confiavel');
  });

  it('fallback seguro quando não há dados reais', async () => {
    const db = createMockDb();
    const record = await recalculateUserGamification(db, HELPER_ID, 'helper');

    expect(record).not.toBeNull();
    expect(record!.levelKey).toBe('novo');
    expect(record!.heroKey).toBe('helper_novo');
    expect(record!.stats.totalCompleted).toBe(0);
    expect(record!.stats.avgRating).toBe(0);
  });
});

describe('recalculateUserGamification — client', () => {
  it('usa requests publicados/concluídos/cancelados', async () => {
    const db = createMockDb({
      profile: { ...fullProfile, id: CLIENT_ID },
      requests: [
        { client_id: CLIENT_ID, status: 'completed' },
        { client_id: CLIENT_ID, status: 'open' },
        { client_id: CLIENT_ID, status: 'cancelled' },
      ],
    });

    const record = await recalculateUserGamification(db, CLIENT_ID, 'client');

    expect(record!.stats.publishedOrdersCount).toBe(3);
    expect(record!.stats.totalCompleted).toBe(1);
    expect(record!.stats.cancelCount).toBe(1);
    expect(record!.levelKey).toBe('confiavel');
    expect(record!.heroKey).toBe('client_confiavel');
  });
});

describe('updateUserGamification — troca automática de nível', () => {
  it('sobe para profissional quando score e requisitos permitem', async () => {
    const db = createMockDb();
    const stats: GamificationStats = {
      totalCompleted: 3,
      avgRating: 4.6,
      responseRate: 75,
      cancelCount: 0,
      complaintCount: 0,
      profilePct: 100,
      applicationsCount: 5,
      publishedOrdersCount: 0,
      hireRate: 40,
    };

    const record = await updateUserGamification(db, HELPER_ID, 'helper', stats);

    expect(record!.levelKey).toBe('profissional');
    expect(record!.heroKey).toBe('helper_profissional');
  });

  it('heroKey sempre acompanha o levelKey persistido', async () => {
    const db = createMockDb();
    const stats: GamificationStats = {
      totalCompleted: 0,
      avgRating: 0,
      responseRate: 0,
      cancelCount: 0,
      complaintCount: 0,
      profilePct: 90,
      applicationsCount: 1,
      publishedOrdersCount: 0,
      hireRate: 0,
    };

    const record = await updateUserGamification(db, HELPER_ID, 'helper', stats);
    const reread = await getUserGamification(db, HELPER_ID, 'helper');

    expect(record!.levelKey).toBe('confiavel');
    expect(reread!.heroKey).toBe('helper_confiavel');
    expect(reread!.heroKey).toBe(record!.heroKey);
  });
});

describe('getUserProgress', () => {
  it('atualiza progresso após update', async () => {
    const db = createMockDb();
    const stats: GamificationStats = {
      totalCompleted: 0,
      avgRating: 0,
      responseRate: 0,
      cancelCount: 0,
      complaintCount: 0,
      profilePct: 90,
      applicationsCount: 1,
      publishedOrdersCount: 0,
      hireRate: 0,
    };

    const record = await updateUserGamification(db, HELPER_ID, 'helper', stats);
    const progress = await getUserProgress(db, HELPER_ID, 'helper');

    expect(progress).not.toBeNull();
    expect(progress!.nextLevel?.key).toBe('profissional');
    expect(progress!.pointsToNext).toBe(250 - record!.score);
    expect(record!.progressPercent).toBeGreaterThan(0);
    expect(record!.missingRequirements.length).toBeGreaterThan(0);
  });

  it('cria registro inicial quando ainda não existe', async () => {
    const db = createMockDb();
    const progress = await getUserProgress(db, CLIENT_ID, 'client');

    expect(progress).not.toBeNull();
    expect(progress!.currentLevel.key).toBe('novo');
    expect(progress!.nextLevel?.key).toBe('confiavel');
  });
});
