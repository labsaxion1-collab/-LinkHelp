/** BackOffice RBAC — permission ids (mirror admin_permissions seed). */
export const BACKOFFICE_PERMISSIONS = [
  'dashboard.read',
  'users.read',
  'requests.read',
  'credits.read',
  'economy.read',
  'audit.read',
  'support.view',
  'users.write',
  'credits.write',
  'requests.write',
  'economy.write',
] as const;

export type BackofficePermission = (typeof BACKOFFICE_PERMISSIONS)[number];

export const BACKOFFICE_ROLES = [
  'super_admin',
  'operations_admin',
  'finance_admin',
  'support_agent',
  'analyst_readonly',
] as const;

export type BackofficeRoleId = (typeof BACKOFFICE_ROLES)[number];

/** Temporary bootstrap: JWT app_metadata admins map to super_admin until full RBAC UI exists. */
export function isLegacyFluxAdminRole(appRole: unknown): boolean {
  return appRole === 'admin' || appRole === 'flux_admin';
}

export function roleGrantsPermission(roleId: BackofficeRoleId, permission: BackofficePermission): boolean {
  if (roleId === 'super_admin') return true;
  const matrix: Record<Exclude<BackofficeRoleId, 'super_admin'>, BackofficePermission[]> = {
    operations_admin: ['dashboard.read', 'users.read', 'requests.read', 'audit.read', 'support.view'],
    finance_admin: ['dashboard.read', 'credits.read', 'economy.read', 'audit.read'],
    support_agent: ['dashboard.read', 'users.read', 'requests.read', 'support.view', 'audit.read'],
    analyst_readonly: ['dashboard.read', 'economy.read', 'credits.read', 'audit.read'],
  };
  return matrix[roleId]?.includes(permission) ?? false;
}
