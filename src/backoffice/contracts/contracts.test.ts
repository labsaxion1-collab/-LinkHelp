import { describe, expect, it } from 'vitest';
import { parseBackofficeUserList, parseBackofficeUserDetail } from './usersContract';
import { parseBackofficeRequestList, parseBackofficeRequestDetail } from './requestsContract';
import { parseBackofficeCreditList } from './creditsContract';
import { parseBackofficeAuditList } from './auditContract';

describe('backoffice API contracts', () => {
  it('parses user list envelope', () => {
    const parsed = parseBackofficeUserList({
      total: 1,
      limit: 50,
      offset: 0,
      users: [{ id: 'u1', name: 'Ana', email: 'a@x.com', role: 'client', city: null, region: null, country: null, rating: null, created_at: '2026-01-01', credit_balance: 0 }],
    });
    expect(parsed?.users).toHaveLength(1);
    expect(parsed?.users[0].id).toBe('u1');
  });

  it('rejects malformed user list', () => {
    expect(parseBackofficeUserList(null)).toBeNull();
  });

  it('parses user detail envelope', () => {
    const parsed = parseBackofficeUserDetail({
      profile: { id: 'u1', name: 'Ana' },
      wallet: null,
      recentTransactions: [],
      recentApplications: [],
      recentRequests: [],
      complaintCount: 0,
    });
    expect(parsed?.profile.id).toBe('u1');
  });

  it('parses request list and detail envelopes', () => {
    const list = parseBackofficeRequestList({
      total: 1,
      limit: 50,
      offset: 0,
      requests: [{ id: 'r1', title: 'Move', category: 'moving', status: 'open', budget: '100', location: 'MTL', client_id: 'c1', client_name: 'Bob', created_at: '2026-01-01', application_count: 2 }],
    });
    expect(list?.requests[0].application_count).toBe(2);

    const detail = parseBackofficeRequestDetail({
      request: { id: 'r1', title: 'Move' },
      client: { name: 'Bob' },
      applications: [{ status: 'pending' }],
    });
    expect(detail?.request.id).toBe('r1');
    expect(detail?.applications).toHaveLength(1);
  });

  it('parses credit and audit list envelopes', () => {
    const credits = parseBackofficeCreditList({
      total: 1,
      limit: 50,
      offset: 0,
      transactions: [{ id: 't1', helper_id: 'h1', helper_name: 'H', type: 'CREDIT_PURCHASE', amount: 10, balance_after: 20, request_id: null, application_id: null, description: '', created_at: '2026-01-01' }],
    });
    expect(credits?.transactions[0].amount).toBe(10);

    const audit = parseBackofficeAuditList({
      total: 1,
      limit: 50,
      offset: 0,
      logs: [{ id: 'l1', admin_id: 'a1', action: 'users.list', target_type: 'user', target_id: null, reason: null, correlation_id: null, created_at: '2026-01-01' }],
    });
    expect(audit?.logs[0].action).toBe('users.list');
  });
});
