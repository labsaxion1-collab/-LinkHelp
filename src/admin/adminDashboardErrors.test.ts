import { describe, expect, it } from 'vitest';
import { adminDashboardErrorMessage, isAdminDashboardApiErrorCode } from './adminDashboardErrors';

describe('admin dashboard errors', () => {
  it('recognizes known API error codes', () => {
    expect(isAdminDashboardApiErrorCode('ADMIN_SUMMARY_RPC_FAILED')).toBe(true);
    expect(isAdminDashboardApiErrorCode('FORBIDDEN')).toBe(false);
  });

  it('maps codes to Portuguese messages for FLUX admin UI', () => {
    expect(adminDashboardErrorMessage('ADMIN_FORBIDDEN')).toContain('acesso');
    expect(adminDashboardErrorMessage('ADMIN_SUMMARY_RPC_FAILED')).toContain('métricas');
    expect(adminDashboardErrorMessage('ADMIN_SUMMARY_UNAVAILABLE')).toContain('métricas');
  });
});
