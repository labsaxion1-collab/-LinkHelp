import { describe, expect, it, vi } from 'vitest';
import { authorizeAdmin, extractBearerToken } from '../../../api/lib/adminAuth.server';

function verifier(result: { data: { user: unknown }; error: unknown }) {
  return { auth: { getUser: vi.fn(async () => result) } } as never;
}

describe('admin server authorization', () => {
  it('returns 401 without or with malformed token', async () => {
    expect(extractBearerToken(undefined)).toBeNull();
    expect(extractBearerToken('Basic abc')).toBeNull();
    await expect(authorizeAdmin(undefined, verifier({ data: { user: null }, error: null }))).resolves.toEqual({ ok: false, status: 401, error: 'UNAUTHORIZED' });
  });

  it('returns 401 for invalid token', async () => {
    const auth = verifier({ data: { user: null }, error: { message: 'invalid' } });
    await expect(authorizeAdmin('Bearer invalid', auth)).resolves.toEqual({ ok: false, status: 401, error: 'UNAUTHORIZED' });
  });

  it('returns 403 for normal user even if client input claims admin', async () => {
    const user = { id: 'u1', app_metadata: { role: 'client' } };
    await expect(authorizeAdmin('Bearer valid', verifier({ data: { user }, error: null }))).resolves.toEqual({ ok: false, status: 403, error: 'FORBIDDEN' });
  });

  it('returns 403 for flux_admin (UI-only role without full API access)', async () => {
    const user = { id: 'flux-1', app_metadata: { role: 'flux_admin' } };
    await expect(authorizeAdmin('Bearer valid', verifier({ data: { user }, error: null }))).resolves.toEqual({
      ok: false,
      status: 403,
      error: 'FORBIDDEN',
    });
  });

  it('accepts role admin only from validated user app_metadata', async () => {
    const user = { id: 'admin-1', app_metadata: { role: 'admin' } };
    const result = await authorizeAdmin('Bearer valid', verifier({ data: { user }, error: null }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.user.id).toBe('admin-1');
  });
});
