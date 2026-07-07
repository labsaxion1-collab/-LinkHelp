import { describe, expect, it } from 'vitest';
import { determineSequentialLevel } from '@/gamification/engines/levelEngine';
import {
  buildClientGamificationStats,
  buildHelperGamificationStats,
  calculateComplaintCount,
  calculateResponseRate,
  computeConfirmedComplaintCount,
  computeResponseRate,
} from '@/gamification/services/gamificationStatsAdapter';
import type { GamificationDb } from '@/gamification/services/gamificationStatsAdapter';

const HELPER_ID = 'helper-1';
const CLIENT_ID = 'client-1';
const CLIENT_PEER = 'client-peer';
const HELPER_PEER = 'helper-peer';

type SeedConversation = {
  id: string;
  client_id: string;
  helper_id: string;
};

type SeedMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  created_at: string;
};

type SeedComplaint = {
  id: string;
  reported_user_id: string;
  status: string;
};

type AdapterMockSeed = {
  conversations?: SeedConversation[];
  messages?: SeedMessage[];
  complaints?: SeedComplaint[];
};

function createAdapterMockDb(seed: AdapterMockSeed = {}) {
  class MockQuery {
    private filters: Record<string, unknown> = {};
    private inFilters: Record<string, unknown[]> = {};

    constructor(private table: string) {}

    select() {
      return this;
    }

    eq(column: string, value: unknown) {
      this.filters[column] = value;
      return this;
    }

    in(column: string, values: unknown[]) {
      this.inFilters[column] = values;
      return this;
    }

    async maybeSingle() {
      return { data: null, error: null };
    }

    then<T>(onFulfilled: (value: { count?: number; data?: unknown[]; error: null }) => T) {
      let rows: Array<Record<string, unknown>> = [];
      if (this.table === 'conversations') rows = seed.conversations ?? [];
      if (this.table === 'messages') rows = seed.messages ?? [];
      if (this.table === 'user_complaints') rows = seed.complaints ?? [];

      const filtered = rows.filter((row) => {
        for (const [column, value] of Object.entries(this.filters)) {
          if (row[column] !== value) return false;
        }
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

  const db = {
    from(table: string) {
      return new MockQuery(table);
    },
  };

  return db as unknown as GamificationDb;
}

function makeConversations(count: number, prefix: string): SeedConversation[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-conv-${index + 1}`,
    client_id: CLIENT_PEER,
    helper_id: HELPER_ID,
  }));
}

describe('computeResponseRate', () => {
  it('responseRate sem conversas = 0', () => {
    expect(computeResponseRate([], [], HELPER_ID, 'helper')).toBe(0);
  });

  it('responseRate 10 conversas / 7 respondidas = 70', () => {
    const conversations = makeConversations(10, 'helper');
    const messages: SeedMessage[] = [];

    conversations.forEach((conversation, index) => {
      messages.push({
        id: `client-msg-${index + 1}`,
        conversation_id: conversation.id,
        sender_id: CLIENT_PEER,
        created_at: `2026-01-${String(index + 1).padStart(2, '0')}T10:00:00Z`,
      });

      if (index < 7) {
        messages.push({
          id: `helper-msg-${index + 1}`,
          conversation_id: conversation.id,
          sender_id: HELPER_ID,
          created_at: `2026-01-${String(index + 1).padStart(2, '0')}T11:00:00Z`,
        });
      }
    });

    expect(computeResponseRate(conversations, messages, HELPER_ID, 'helper')).toBe(70);
  });

  it('conversa sem mensagem do parceiro não entra no denominador', () => {
    const conversations = makeConversations(1, 'helper');
    const messages: SeedMessage[] = [
      {
        id: 'helper-only',
        conversation_id: conversations[0].id,
        sender_id: HELPER_ID,
        created_at: '2026-01-01T10:00:00Z',
      },
    ];

    expect(computeResponseRate(conversations, messages, HELPER_ID, 'helper')).toBe(0);
  });

  it('cliente só responde após a primeira mensagem do helper', () => {
    const conversations: SeedConversation[] = [
      { id: 'client-conv-1', client_id: CLIENT_ID, helper_id: HELPER_PEER },
    ];
    const messages: SeedMessage[] = [
      {
        id: 'client-first',
        conversation_id: 'client-conv-1',
        sender_id: CLIENT_ID,
        created_at: '2026-01-01T09:00:00Z',
      },
      {
        id: 'helper-first',
        conversation_id: 'client-conv-1',
        sender_id: HELPER_PEER,
        created_at: '2026-01-01T10:00:00Z',
      },
      {
        id: 'client-reply',
        conversation_id: 'client-conv-1',
        sender_id: CLIENT_ID,
        created_at: '2026-01-01T11:00:00Z',
      },
    ];

    expect(computeResponseRate(conversations, messages, CLIENT_ID, 'client')).toBe(100);
  });
});

describe('calculateResponseRate', () => {
  it('retorna 0 quando não há conversas no banco', async () => {
    const db = createAdapterMockDb();
    await expect(calculateResponseRate(db, HELPER_ID, 'helper')).resolves.toBe(0);
  });

  it('consulta conversations e messages reais do mock', async () => {
    const conversations = makeConversations(2, 'helper');
    const messages: SeedMessage[] = [
      {
        id: 'c1-client',
        conversation_id: conversations[0].id,
        sender_id: CLIENT_PEER,
        created_at: '2026-01-01T10:00:00Z',
      },
      {
        id: 'c1-helper',
        conversation_id: conversations[0].id,
        sender_id: HELPER_ID,
        created_at: '2026-01-01T11:00:00Z',
      },
      {
        id: 'c2-client',
        conversation_id: conversations[1].id,
        sender_id: CLIENT_PEER,
        created_at: '2026-01-02T10:00:00Z',
      },
    ];

    const db = createAdapterMockDb({ conversations, messages });
    await expect(calculateResponseRate(db, HELPER_ID, 'helper')).resolves.toBe(50);
  });
});

describe('responseRate integrado à progressão de nível', () => {
  it('helper com responseRate suficiente consegue subir para Profissional', async () => {
    const conversations = makeConversations(10, 'helper');
    const messages: SeedMessage[] = conversations.flatMap((conversation, index) => [
      {
        id: `peer-${index}`,
        conversation_id: conversation.id,
        sender_id: CLIENT_PEER,
        created_at: `2026-01-${String(index + 1).padStart(2, '0')}T10:00:00Z`,
      },
      {
        id: `helper-${index}`,
        conversation_id: conversation.id,
        sender_id: HELPER_ID,
        created_at: `2026-01-${String(index + 1).padStart(2, '0')}T11:00:00Z`,
      },
    ]);

    const db = createAdapterMockDb({ conversations, messages });
    const stats = await buildHelperGamificationStats(db, HELPER_ID);

    expect(stats.responseRate).toBe(100);
    expect(
      determineSequentialLevel('helper', 'confiavel', 300, {
        ...stats,
        totalCompleted: 3,
        avgRating: 4.6,
        profilePct: 100,
        applicationsCount: 5,
      }),
    ).toBe('profissional');
  });

  it('cliente com responseRate suficiente consegue subir para VIP', async () => {
    const conversations: SeedConversation[] = Array.from({ length: 10 }, (_, index) => ({
      id: `client-conv-${index + 1}`,
      client_id: CLIENT_ID,
      helper_id: `helper-peer-${index + 1}`,
    }));
    const messages: SeedMessage[] = conversations.flatMap((conversation, index) => [
      {
        id: `helper-peer-${index}`,
        conversation_id: conversation.id,
        sender_id: conversation.helper_id,
        created_at: `2026-02-${String(index + 1).padStart(2, '0')}T10:00:00Z`,
      },
      {
        id: `client-reply-${index}`,
        conversation_id: conversation.id,
        sender_id: CLIENT_ID,
        created_at: `2026-02-${String(index + 1).padStart(2, '0')}T11:00:00Z`,
      },
    ]);

    const db = createAdapterMockDb({ conversations, messages });
    const stats = await buildClientGamificationStats(db, CLIENT_ID);

    expect(stats.responseRate).toBe(100);
    expect(
      determineSequentialLevel('client', 'ouro', 550, {
        ...stats,
        totalCompleted: 10,
        avgRating: 4.8,
        cancelCount: 1,
        profilePct: 100,
        publishedOrdersCount: 12,
      }),
    ).toBe('vip');
  });
});

describe('computeConfirmedComplaintCount', () => {
  it('sem reclamações = 0', () => {
    expect(computeConfirmedComplaintCount([], HELPER_ID)).toBe(0);
  });

  it('reclamação open não penaliza (somente confirmed)', () => {
    const complaints: SeedComplaint[] = [
      { id: 'c1', reported_user_id: HELPER_ID, status: 'open' },
      { id: 'c2', reported_user_id: HELPER_ID, status: 'rejected' },
    ];
    expect(computeConfirmedComplaintCount(complaints, HELPER_ID)).toBe(0);
  });

  it('reclamação confirmed conta', () => {
    const complaints: SeedComplaint[] = [
      { id: 'c1', reported_user_id: HELPER_ID, status: 'open' },
      { id: 'c2', reported_user_id: HELPER_ID, status: 'confirmed' },
      { id: 'c3', reported_user_id: HELPER_ID, status: 'confirmed' },
      { id: 'c4', reported_user_id: CLIENT_ID, status: 'confirmed' },
    ];
    expect(computeConfirmedComplaintCount(complaints, HELPER_ID)).toBe(2);
  });
});

describe('calculateComplaintCount', () => {
  it('consulta user_complaints com status confirmed', async () => {
    const db = createAdapterMockDb({
      complaints: [
        { id: 'c1', reported_user_id: HELPER_ID, status: 'open' },
        { id: 'c2', reported_user_id: HELPER_ID, status: 'confirmed' },
      ],
    });

    await expect(calculateComplaintCount(db, HELPER_ID)).resolves.toBe(1);
  });
});

describe('complaintCount integrado à progressão de nível', () => {
  const lendaStats = {
    totalCompleted: 50,
    avgRating: 4.9,
    responseRate: 95,
    cancelCount: 0,
    profilePct: 100,
    applicationsCount: 10,
    publishedOrdersCount: 0,
    hireRate: 40,
  };

  const eliteClientStats = {
    totalCompleted: 25,
    avgRating: 4.9,
    responseRate: 85,
    cancelCount: 0,
    profilePct: 100,
    applicationsCount: 0,
    publishedOrdersCount: 30,
    hireRate: 0,
  };

  it('Helper Lenda exige complaint_count <= 0', async () => {
    const db = createAdapterMockDb({
      complaints: [{ id: 'c1', reported_user_id: HELPER_ID, status: 'confirmed' }],
    });
    const stats = await buildHelperGamificationStats(db, HELPER_ID);

    expect(stats.complaintCount).toBe(1);
    expect(determineSequentialLevel('helper', 'top_helper', 950, { ...lendaStats, ...stats })).toBe(
      'top_helper',
    );
    expect(
      determineSequentialLevel('helper', 'top_helper', 950, { ...lendaStats, complaintCount: 0 }),
    ).toBe('lenda');
  });

  it('Cliente Elite exige complaint_count <= 0', async () => {
    const db = createAdapterMockDb({
      complaints: [{ id: 'c1', reported_user_id: CLIENT_ID, status: 'confirmed' }],
    });
    const stats = await buildClientGamificationStats(db, CLIENT_ID);

    expect(stats.complaintCount).toBe(1);
    expect(
      determineSequentialLevel('client', 'vip', 800, { ...eliteClientStats, ...stats }),
    ).toBe('vip');
    expect(
      determineSequentialLevel('client', 'vip', 800, { ...eliteClientStats, complaintCount: 0 }),
    ).toBe('elite');
  });
});
