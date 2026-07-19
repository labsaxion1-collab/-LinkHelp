export type AdminDashboardApiErrorCode =
  | 'ADMIN_SUMMARY_UNAVAILABLE'
  | 'ADMIN_SUMMARY_RPC_FAILED'
  | 'ADMIN_SUMMARY_INVALID'
  | 'ADMIN_SUMMARY_FINANCIAL_UNAVAILABLE'
  | 'SUPABASE_SERVER_NOT_CONFIGURED'
  | 'ADMIN_SESSION_EXPIRED'
  | 'ADMIN_FORBIDDEN'
  | 'ADMIN_SUMMARY_NETWORK';

export function isAdminDashboardApiErrorCode(value: unknown): value is AdminDashboardApiErrorCode {
  return (
    value === 'ADMIN_SUMMARY_UNAVAILABLE' ||
    value === 'ADMIN_SUMMARY_RPC_FAILED' ||
    value === 'ADMIN_SUMMARY_INVALID' ||
    value === 'ADMIN_SUMMARY_FINANCIAL_UNAVAILABLE' ||
    value === 'SUPABASE_SERVER_NOT_CONFIGURED' ||
    value === 'ADMIN_SESSION_EXPIRED' ||
    value === 'ADMIN_FORBIDDEN' ||
    value === 'ADMIN_SUMMARY_NETWORK'
  );
}

export function adminDashboardErrorTranslationKey(code: AdminDashboardApiErrorCode): string {
  switch (code) {
    case 'ADMIN_SESSION_EXPIRED':
      return 'flux_admin.error_session_expired';
    case 'ADMIN_FORBIDDEN':
      return 'flux_admin.error_forbidden';
    case 'SUPABASE_SERVER_NOT_CONFIGURED':
      return 'flux_admin.error_server_not_configured';
    case 'ADMIN_SUMMARY_INVALID':
      return 'flux_admin.error_invalid_payload';
    case 'ADMIN_SUMMARY_RPC_FAILED':
      return 'flux_admin.error_rpc_failed';
    case 'ADMIN_SUMMARY_NETWORK':
      return 'flux_admin.error_network';
    case 'ADMIN_SUMMARY_FINANCIAL_UNAVAILABLE':
      return 'flux_admin.financial_unavailable';
    case 'ADMIN_SUMMARY_UNAVAILABLE':
    default:
      return 'flux_admin.error_summary_unavailable';
  }
}
