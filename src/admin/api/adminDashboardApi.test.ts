import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminApiError, clearAdminDashboardCache, resetAdminDashboardApiForTests, subscribeAdminDashboardSummary } from './adminDashboardApi';

const summary = { totalRequests: 1, openRequests: 1, inProgressRequests: 0, totalApplications: 0, pendingApplications: 0, hiredApplications: 0, hireRate: 0, categories: [] };

describe('admin dashboard API client', () => {
  afterEach(() => {
    resetAdminDashboardApiForTests();
    vi.unstubAllGlobals();
  });

  it('deduplicates concurrent calls for the same user', async () => {
    let resolveFetch!: (value: unknown) => void;
    const fetchMock = vi.fn(() => new Promise((resolve) => { resolveFetch = resolve; }));
    vi.stubGlobal('fetch', fetchMock);
    const first = subscribeAdminDashboardSummary({ userId: 'admin-1', accessToken: 'token' });
    const second = subscribeAdminDashboardSummary({ userId: 'admin-1', accessToken: 'token' });
    expect(first.promise).toBe(second.promise);
    expect(fetchMock).toHaveBeenCalledOnce();
    resolveFetch({ ok: true, json: async () => summary });
    await expect(first.promise).resolves.toEqual(summary);
    first.release();
    second.release();
  });

  it('isolates cache by user and clears it on logout', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => summary }));
    vi.stubGlobal('fetch', fetchMock);
    await subscribeAdminDashboardSummary({ userId: 'admin-1', accessToken: 'one' }).promise;
    await subscribeAdminDashboardSummary({ userId: 'admin-1', accessToken: 'one' }).promise;
    await subscribeAdminDashboardSummary({ userId: 'admin-2', accessToken: 'two' }).promise;
    expect(fetchMock).toHaveBeenCalledTimes(2);
    clearAdminDashboardCache('admin-1');
    await subscribeAdminDashboardSummary({ userId: 'admin-1', accessToken: 'one' }).promise;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('aborts an in-flight request after the final subscriber releases', () => {
    const fetchMock = vi.fn((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    }));
    vi.stubGlobal('fetch', fetchMock);
    const first = subscribeAdminDashboardSummary({ userId: 'admin-1', accessToken: 'token' });
    const second = subscribeAdminDashboardSummary({ userId: 'admin-1', accessToken: 'token' });
    first.release();
    expect((fetchMock.mock.calls[0][1] as RequestInit).signal?.aborted).toBe(false);
    second.release();
    expect((fetchMock.mock.calls[0][1] as RequestInit).signal?.aborted).toBe(true);
    void first.promise.catch(() => {});
  });

  it.each([401, 403])('surfaces HTTP %s without exposing the token', async (status) => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status })));
    const request = subscribeAdminDashboardSummary({ userId: 'admin-1', accessToken: 'secret-token' });
    await expect(request.promise).rejects.toMatchObject({ status } satisfies Partial<AdminApiError>);
    await expect(request.promise).rejects.not.toThrow('secret-token');
  });
});
