import { describe, expect, it } from 'vitest';
import {
  BACKOFFICE_PERMISSIONS,
  BACKOFFICE_ROLES,
  isLegacyFluxAdminRole,
  roleGrantsPermission,
} from './roles';

describe('backoffice RBAC roles', () => {
  it('defines five roles and eleven permissions', () => {
    expect(BACKOFFICE_ROLES).toHaveLength(5);
    expect(BACKOFFICE_PERMISSIONS).toHaveLength(11);
  });

  it('treats admin and flux_admin JWT roles as legacy admins', () => {
    expect(isLegacyFluxAdminRole('admin')).toBe(true);
    expect(isLegacyFluxAdminRole('flux_admin')).toBe(true);
    expect(isLegacyFluxAdminRole('client')).toBe(false);
    expect(isLegacyFluxAdminRole(undefined)).toBe(false);
  });

  it('grants super_admin every permission', () => {
    for (const perm of BACKOFFICE_PERMISSIONS) {
      expect(roleGrantsPermission('super_admin', perm)).toBe(true);
    }
  });

  it('scopes finance_admin to credits, economy, audit and dashboard', () => {
    expect(roleGrantsPermission('finance_admin', 'credits.read')).toBe(true);
    expect(roleGrantsPermission('finance_admin', 'economy.read')).toBe(true);
    expect(roleGrantsPermission('finance_admin', 'users.read')).toBe(false);
    expect(roleGrantsPermission('finance_admin', 'support.view')).toBe(false);
  });

  it('scopes support_agent to users, requests, support and audit', () => {
    expect(roleGrantsPermission('support_agent', 'support.view')).toBe(true);
    expect(roleGrantsPermission('support_agent', 'users.read')).toBe(true);
    expect(roleGrantsPermission('support_agent', 'credits.read')).toBe(false);
    expect(roleGrantsPermission('support_agent', 'economy.write')).toBe(false);
  });

  it('scopes analyst_readonly to read-only analytics permissions', () => {
    expect(roleGrantsPermission('analyst_readonly', 'economy.read')).toBe(true);
    expect(roleGrantsPermission('analyst_readonly', 'users.read')).toBe(false);
    expect(roleGrantsPermission('analyst_readonly', 'requests.write')).toBe(false);
  });
});
