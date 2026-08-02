import type { BackofficePermission, BackofficeRoleId } from '@/backoffice/permissions/roles';
import { BackofficeApiError } from '@/backoffice/api/backofficeClient';

export type AdminMeResponse = {
  userId: string;
  email: string | null;
  roles: BackofficeRoleId[];
  permissions: BackofficePermission[];
};

export async function fetchAdminMe(accessToken: string): Promise<AdminMeResponse> {
  const response = await fetch('/api/admin/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    let code = 'ADMIN_ME_UNAVAILABLE';
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) code = body.error;
    } catch {
      // ignore
    }
    throw new BackofficeApiError(response.status, code);
  }
  return (await response.json()) as AdminMeResponse;
}

export function canManageAdmins(permissions: readonly string[] | null | undefined): boolean {
  return Boolean(permissions?.includes('admins.manage'));
}
