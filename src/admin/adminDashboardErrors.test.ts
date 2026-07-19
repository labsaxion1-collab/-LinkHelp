import { describe, expect, it } from 'vitest';
import { adminDashboardErrorTranslationKey, isAdminDashboardApiErrorCode } from './adminDashboardErrors';

describe('admin dashboard errors', () => {
  it('recognizes known API error codes', () => {
    expect(isAdminDashboardApiErrorCode('ADMIN_SUMMARY_RPC_FAILED')).toBe(true);
    expect(isAdminDashboardApiErrorCode('FORBIDDEN')).toBe(false);
  });

  it('maps codes to flux_admin translation keys in PT/EN/FR namespaces', () => {
    expect(adminDashboardErrorTranslationKey('ADMIN_FORBIDDEN')).toBe('flux_admin.error_forbidden');
    expect(adminDashboardErrorTranslationKey('ADMIN_SUMMARY_RPC_FAILED')).toBe('flux_admin.error_rpc_failed');
    expect(adminDashboardErrorTranslationKey('ADMIN_SUMMARY_UNAVAILABLE')).toBe('flux_admin.error_summary_unavailable');
  });
});
