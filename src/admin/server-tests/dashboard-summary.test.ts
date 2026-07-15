import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../../../api/admin/dashboard-summary';
import { authorizeAdmin } from '../../../api/lib/adminAuth.server';
import { createSupabaseServiceRoleClient } from '../../../api/lib/supabaseAdmin.server';

vi.mock('../../../api/lib/adminAuth.server', () => ({ authorizeAdmin: vi.fn() }));
vi.mock('../../../api/lib/supabaseAdmin.server', () => ({ createSupabaseServiceRoleClient: vi.fn() }));

const summaryRow = { total_requests: 1, open_requests: 1, in_progress_requests: 0, total_applications: 1, pending_applications: 0, hired_applications: 1, hire_rate: 100, categories: [] };

function response() {
  const res: Record<string, unknown> = {};
  res.setHeader = vi.fn();
  res.status = vi.fn((status: number) => { res.statusCode = status; return res; });
  res.json = vi.fn((body: unknown) => { res.body = body; return res; });
  return res as never;
}

describe('GET /api/admin/dashboard-summary', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects non-GET methods before authentication', async () => {
    const res = response();
    await handler({ method: 'POST', headers: {}, body: { role: 'admin' } } as never, res);
    expect(res).toMatchObject({ statusCode: 405, body: { error: 'METHOD_NOT_ALLOWED' } });
    expect(authorizeAdmin).not.toHaveBeenCalled();
  });

  it.each([
    [{ ok: false, status: 401, error: 'UNAUTHORIZED' }, 401],
    [{ ok: false, status: 403, error: 'FORBIDDEN' }, 403],
  ] as const)('returns authorization failure without creating service client', async (authorization, status) => {
    vi.mocked(authorizeAdmin).mockResolvedValue(authorization);
    const res = response();
    await handler({ method: 'GET', headers: { authorization: 'Bearer token' }, query: { role: 'admin' } } as never, res);
    expect(res).toMatchObject({ statusCode: status });
    expect(createSupabaseServiceRoleClient).not.toHaveBeenCalled();
  });

  it('returns only validated aggregate fields for an admin', async () => {
    vi.mocked(authorizeAdmin).mockResolvedValue({ ok: true, user: { id: 'admin' } as never });
    const rpc = vi.fn(async () => ({ data: [summaryRow], error: null }));
    vi.mocked(createSupabaseServiceRoleClient).mockReturnValue({ rpc } as never);
    const res = response();
    await handler({ method: 'GET', headers: { authorization: 'Bearer token' } } as never, res);
    expect(rpc).toHaveBeenCalledWith('admin_dashboard_summary');
    expect(res).toMatchObject({ statusCode: 200, body: { totalRequests: 1, hireRate: 100, categories: [] } });
    expect(JSON.stringify((res as never as { body: unknown }).body)).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
  });

  it('sanitizes RPC errors', async () => {
    vi.mocked(authorizeAdmin).mockResolvedValue({ ok: true, user: { id: 'admin' } as never });
    vi.mocked(createSupabaseServiceRoleClient).mockReturnValue({ rpc: vi.fn(async () => ({ data: null, error: { code: '42501', message: 'private detail' } })) } as never);
    const res = response();
    await handler({ method: 'GET', headers: { authorization: 'Bearer token' } } as never, res);
    expect(res).toMatchObject({ statusCode: 502, body: { error: 'ADMIN_SUMMARY_UNAVAILABLE' } });
    expect(JSON.stringify((res as never as { body: unknown }).body)).not.toContain('private detail');
  });
});
