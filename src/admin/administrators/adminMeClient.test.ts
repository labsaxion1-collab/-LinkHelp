import { describe, expect, it } from 'vitest';
import { canManageAdmins } from './adminMeClient';
import { ROUTES } from '@/utils/constants';

describe('admin me / manage menu', () => {
  it('shows Administrators only when permissions include admins.manage', () => {
    expect(canManageAdmins(['dashboard.read', 'users.read'])).toBe(false);
    expect(canManageAdmins(['dashboard.read', 'admins.manage'])).toBe(true);
    expect(canManageAdmins(null)).toBe(false);
  });

  it('registers FLUX administrators route', () => {
    expect(ROUTES.adminAdministrators).toBe('/admin/administrators');
  });
});
