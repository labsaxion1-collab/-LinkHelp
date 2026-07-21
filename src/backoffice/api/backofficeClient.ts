import type { BackofficePermission } from '@/backoffice/permissions/roles';

export class BackofficeApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
  ) {
    super(code);
    this.name = 'BackofficeApiError';
  }
}

async function parseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    if (body.error) return body.error;
  } catch {
    // ignore
  }
  if (response.status === 401) return 'UNAUTHORIZED';
  if (response.status === 403) return 'FORBIDDEN';
  return 'BACKOFFICE_UNAVAILABLE';
}

export async function backofficeFetch<T>(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    throw new BackofficeApiError(response.status, await parseError(response));
  }
  return (await response.json()) as T;
}

export type BackofficeSession = {
  accessToken: string;
  permissions: BackofficePermission[];
};
