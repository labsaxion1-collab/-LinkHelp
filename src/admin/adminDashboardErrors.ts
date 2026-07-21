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

export function adminDashboardErrorMessage(code: AdminDashboardApiErrorCode): string {
  switch (code) {
    case 'ADMIN_SESSION_EXPIRED':
      return 'Sua sessão admin expirou. Entre novamente.';
    case 'ADMIN_FORBIDDEN':
      return 'Esta conta não tem acesso completo à API administrativa.';
    case 'SUPABASE_SERVER_NOT_CONFIGURED':
      return 'Servidor de métricas admin não está configurado.';
    case 'ADMIN_SUMMARY_INVALID':
      return 'As métricas admin retornaram uma resposta inválida.';
    case 'ADMIN_SUMMARY_RPC_FAILED':
      return 'Função de métricas admin ausente ou indisponível no banco.';
    case 'ADMIN_SUMMARY_NETWORK':
      return 'Não foi possível contactar a API de métricas admin.';
    case 'ADMIN_SUMMARY_FINANCIAL_UNAVAILABLE':
      return 'Métricas financeiras temporariamente indisponíveis.';
    case 'ADMIN_SUMMARY_UNAVAILABLE':
    default:
      return 'Não foi possível carregar as métricas administrativas.';
  }
}
