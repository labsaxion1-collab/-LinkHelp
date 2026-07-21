import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authorizeBackoffice } from '../../../api/lib/adminAuth.server';
import { createSupabaseAuthVerifier, createSupabaseServiceRoleClient } from '../../../api/lib/supabaseAdmin.server';

vi.mock('../../../api/lib/supabaseAdmin.server', () => ({
  createSupabaseAuthVerifier: vi.fn(),
  createSupabaseServiceRoleClient: vi.fn(),
}));

function mockAuth(user: unknown, error: unknown = null) {
  vi.mocked(createSupabaseAuthVerifier).mockReturnValue({
    auth: { getUser: vi.fn(async () => ({ data: { user }, error })) },
  } as never);
}

function mockRoles(rows: { role_id: string }[] | null, error: { code?: string; message?: string } | null = null) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(async () => ({ data: rows, error })),
  };
  vi.mocked(createSupabaseServiceRoleClient).mockReturnValue({ from: vi.fn(() => chain) } as never);
}

describe('authorizeBackoffice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without bearer token', async () => {
    await expect(authorizeBackoffice(undefined)).resolves.toEqual({ ok: false, status: 401, error: 'UNAUTHORIZED' });
  });

  it('returns 403 for non-admin JWT role', async () => {
    mockAuth({ id: 'u1', app_metadata: { role: 'client' } });
    await expect(authorizeBackoffice('Bearer tok')).resolves.toEqual({ ok: false, status: 403, error: 'FORBIDDEN' });
  });

  it('falls back to super_admin when legacy admin has no role rows', async () => {
    mockAuth({ id: 'admin-1', app_metadata: { role: 'admin' } });
    mockRoles([]);
    const result = await authorizeBackoffice('Bearer tok', 'users.read');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.roles).toEqual(['super_admin']);
      expect(result.permissions).toContain('users.read');
    }
  });

  it('accepts flux_admin legacy role', async () => {
    mockAuth({ id: 'flux-1', app_metadata: { role: 'flux_admin' } });
    mockRoles([{ role_id: 'support_agent' }]);
    const result = await authorizeBackoffice('Bearer tok', 'support.view');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.roles).toEqual(['support_agent']);
  });

  it('returns 403 when role lacks required permission', async () => {
    mockAuth({ id: 'fin-1', app_metadata: { role: 'admin' } });
    mockRoles([{ role_id: 'finance_admin' }]);
    await expect(authorizeBackoffice('Bearer tok', 'users.read')).resolves.toEqual({
      ok: false,
      status: 403,
      error: 'FORBIDDEN',
    });
  });

  it('returns 503 when admin_user_roles table is missing', async () => {
    mockAuth({ id: 'admin-1', app_metadata: { role: 'admin' } });
    mockRoles(null, { code: 'XX000', message: 'relation missing' });
    await expect(authorizeBackoffice('Bearer tok')).resolves.toEqual({
      ok: false,
      status: 503,
      error: 'BACKOFFICE_NOT_CONFIGURED',
    });
  });
});
