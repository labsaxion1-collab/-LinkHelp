/**
 * Visual-only formatters and enum label maps for FLUX / BackOffice (pt-BR).
 * Never mutate or replace technical values used in comparisons, filters, or APIs.
 */

export const ADMIN_TIME_ZONE = 'America/Toronto';
export const ADMIN_LOCALE = 'pt-BR';

const dateTimeFormatter = new Intl.DateTimeFormat(ADMIN_LOCALE, {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: ADMIN_TIME_ZONE,
});

const numberFormatter = new Intl.NumberFormat(ADMIN_LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat(ADMIN_LOCALE, {
  maximumFractionDigits: 1,
});

/** CAD display: `CAD $ 12,00` — does not convert currency. */
export function formatCadAmount(amount: number): string {
  if (!Number.isFinite(amount)) return 'CAD $ —';
  return `CAD $ ${numberFormatter.format(amount)}`;
}

/** Format cents as CAD display string. Numeric value unchanged (÷100 only for display). */
export function formatCadFromCents(cents: number): string {
  if (!Number.isFinite(cents)) return 'CAD $ —';
  return formatCadAmount(cents / 100);
}

/** Integer LinkCredits with LC suffix. */
export function formatLc(amount: number): string {
  if (!Number.isFinite(amount)) return '— LC';
  return `${Math.round(amount)} LC`;
}

export function formatAdminPercent(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return `${percentFormatter.format(value)}%`;
}

export function formatAdminDateTime(value: string | number | Date | null | undefined): string {
  if (value == null || value === '') return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return dateTimeFormatter.format(date);
}

const ROLE_LABEL_PT: Record<string, string> = {
  client: 'Cliente',
  helper: 'Help',
  admin: 'Administrador',
  flux_admin: 'Administrador FLUX',
};

export function roleLabelPt(role: string | null | undefined): string {
  if (role == null || role === '') return '—';
  const key = role.trim().toLowerCase();
  return ROLE_LABEL_PT[key] ?? role;
}

/** Request / chamado status — visual only. Includes known aliases from the codebase. */
const REQUEST_STATUS_LABEL_PT: Record<string, string> = {
  open: 'Aberto',
  paused: 'Pausado',
  pending: 'Aberto',
  matched: 'Em andamento',
  scheduled: 'Em andamento',
  in_progress: 'Em andamento',
  hired: 'Contratado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  canceled: 'Cancelado',
  client_cancelled: 'Cancelado',
};

export function requestStatusLabelPt(status: string | null | undefined): string {
  if (status == null || status === '') return '—';
  const key = status.trim().toLowerCase();
  return REQUEST_STATUS_LABEL_PT[key] ?? status;
}

const APPLICATION_STATUS_LABEL_PT: Record<string, string> = {
  pending: 'Pendente',
  interested: 'Pendente',
  viewed: 'Visualizado',
  proposed: 'Visualizado',
  accepted: 'Aprovado',
  hired: 'Aprovado',
  rejected: 'Recusado',
  cancelled: 'Cancelado',
  withdrawn: 'Cancelado',
  completed: 'Concluído',
};

export function applicationStatusLabelPt(status: string | null | undefined): string {
  if (status == null || status === '') return '—';
  const key = status.trim().toLowerCase();
  return APPLICATION_STATUS_LABEL_PT[key] ?? status;
}

const CREDIT_TYPE_LABEL_PT: Record<string, string> = {
  CREDIT_PURCHASE: 'Compra de LinkCredits',
  APPLICATION_INTEREST: 'Interesse em candidatura',
  APPLICATION_SELECTED: 'Seleção da candidatura',
  ADMIN_ADJUSTMENT: 'Ajuste administrativo',
  REFUND: 'Reembolso',
  FREE_BONUS: 'Bônus gratuito',
  OPPORTUNITY_UNLOCK: 'Desbloqueio de oportunidade',
  VIP_EXCLUSIVE_PARTIAL_REFUND: 'Reembolso parcial VIP',
  VIP_APPLICATION_REJECTED_REFUND: 'Reembolso VIP (recusado)',
};

/** Credit type filter options: technical value + PT label. */
export const CREDIT_TYPE_FILTER_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'CREDIT_PURCHASE', label: CREDIT_TYPE_LABEL_PT.CREDIT_PURCHASE },
  { value: 'APPLICATION_INTEREST', label: CREDIT_TYPE_LABEL_PT.APPLICATION_INTEREST },
  { value: 'APPLICATION_SELECTED', label: CREDIT_TYPE_LABEL_PT.APPLICATION_SELECTED },
  { value: 'ADMIN_ADJUSTMENT', label: CREDIT_TYPE_LABEL_PT.ADMIN_ADJUSTMENT },
  { value: 'REFUND', label: CREDIT_TYPE_LABEL_PT.REFUND },
];

export function creditTypeLabelPt(type: string | null | undefined): string {
  if (type == null || type === '') return '—';
  return CREDIT_TYPE_LABEL_PT[type] ?? type;
}

const AUDIT_ACTION_LABEL_PT: Record<string, string> = {
  'users.view_list': 'Usuários — listar',
  'users.view_detail': 'Usuários — visualizar detalhes',
  'requests.view_list': 'Chamados — listar',
  'requests.view_detail': 'Chamados — visualizar detalhes',
  'credits.view_list': 'LinkCredits — listar',
  'credits.view_detail': 'LinkCredits — visualizar detalhes',
  'economy.view': 'Economia — visualizar',
  'audit.view_list': 'Auditoria — listar',
  'support.view': 'Suporte — visualizar',
};

export function auditActionLabelPt(action: string | null | undefined): string {
  if (action == null || action === '') return '—';
  if (AUDIT_ACTION_LABEL_PT[action]) return AUDIT_ACTION_LABEL_PT[action];
  // Safe readable fallback — keep technical token recognizable
  return action.replace(/[_.]/g, ' · ');
}

const AUDIT_TARGET_TYPE_LABEL_PT: Record<string, string> = {
  user: 'Usuário',
  request: 'Chamado',
  credit: 'LinkCredits',
  application: 'Candidatura',
  economy: 'Economia',
  support: 'Suporte',
  admin: 'Administrador',
};

export function auditTargetTypeLabelPt(targetType: string | null | undefined): string {
  if (targetType == null || targetType === '') return '—';
  const key = targetType.trim().toLowerCase();
  return AUDIT_TARGET_TYPE_LABEL_PT[key] ?? targetType;
}

const PACKAGE_LABEL_PT: Record<string, string> = {
  starter: 'Inicial',
  popular: 'Popular',
  pro: 'Pro',
  power: 'Power',
};

export function packageLabelPt(id: string | null | undefined): string {
  if (id == null || id === '') return '—';
  return PACKAGE_LABEL_PT[id] ?? id;
}
