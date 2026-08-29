import { isBaselineFinanceEnabled } from '@/config/baselineFinance';

type PostgrestLikeError = { code?: string; message?: string } | null;

export const MAX_OPTIONAL_SELECT_RETRIES = 12;

/** Never removed from SELECT — required for mappers and activity tabs. */
export const REQUEST_ESSENTIAL_COLUMNS = new Set([
  'id',
  'client_id',
  'status',
  'category',
  'title',
  'description',
]);

export const APPLICATION_ESSENTIAL_COLUMNS = new Set([
  'id',
  'request_id',
  'helper_id',
  'client_id',
  'status',
]);

const REQUEST_KNOWN_OPTIONAL_COLUMNS = [
  'subcategory',
  'urgency',
  'budget',
  'location',
  'address',
  'city',
  'region',
  'postal_code',
  'latitude',
  'longitude',
  'preferred_date',
  'preferred_time_window',
  'preferred_time',
  'budget_type',
  'budget_amount',
  'currency',
  'budget_min',
  'budget_max',
  'accepted_amount',
  'exclusive_helper_id',
  'expires_at',
  'created_at',
  'application_count',
  'service_mode',
] as const;

const APPLICATION_KNOWN_OPTIONAL_COLUMNS = [
  'message',
  'proposed_amount',
  'is_exclusive',
  'created_at',
  'lead_total_lc',
  'lead_debit_lc',
  'lead_service_mode',
] as const;

const REQUEST_BASE_COLUMNS = [
  'id',
  'client_id',
  'title',
  'description',
  'category',
  'subcategory',
  'urgency',
  'budget',
  'location',
  'address',
  'city',
  'region',
  'postal_code',
  'latitude',
  'longitude',
  'preferred_date',
  'preferred_time_window',
  'preferred_time',
  'budget_type',
  'budget_amount',
  'currency',
  'budget_min',
  'budget_max',
  'accepted_amount',
  'exclusive_helper_id',
  'status',
  'expires_at',
  'created_at',
] as const;

const APPLICATION_BASE_COLUMNS = [
  'id',
  'request_id',
  'helper_id',
  'client_id',
  'status',
  'message',
  'proposed_amount',
  'is_exclusive',
  'created_at',
] as const;

const APPLICATION_BASELINE_EXTRA_COLUMNS = ['lead_total_lc', 'lead_debit_lc', 'lead_service_mode'] as const;

const omittedRequestColumns = new Set<string>();
const omittedApplicationColumns = new Set<string>();

export function resetOptionalSelectOmitCacheForTests(): void {
  omittedRequestColumns.clear();
  omittedApplicationColumns.clear();
}

export function omittedRequestColumnsForTests(): ReadonlySet<string> {
  return omittedRequestColumns;
}

export function omittedApplicationColumnsForTests(): ReadonlySet<string> {
  return omittedApplicationColumns;
}

export function markOptionalRequestColumnOmitted(column: string): void {
  if (REQUEST_ESSENTIAL_COLUMNS.has(column)) return;
  omittedRequestColumns.add(column);
}

export function markOptionalApplicationColumnOmitted(column: string): void {
  if (APPLICATION_ESSENTIAL_COLUMNS.has(column)) return;
  omittedApplicationColumns.add(column);
}

/** @deprecated Prefer markOptionalRequestColumnOmitted('application_count') */
export function markRequestsOmitApplicationCount(): void {
  markOptionalRequestColumnOmitted('application_count');
}

export function requestsOmitApplicationCount(): boolean {
  return omittedRequestColumns.has('application_count');
}

export function resetRequestSelectApplicationCountCacheForTests(): void {
  resetOptionalSelectOmitCacheForTests();
}

export function isMissingApplicationCountColumnError(error: PostgrestLikeError): boolean {
  const column = parseMissingColumnFromPostgrestError(error, 'requests');
  return column === 'application_count';
}

export function isKnownOptionalRequestColumn(column: string): boolean {
  return (
    REQUEST_KNOWN_OPTIONAL_COLUMNS.includes(column as (typeof REQUEST_KNOWN_OPTIONAL_COLUMNS)[number]) &&
    !REQUEST_ESSENTIAL_COLUMNS.has(column)
  );
}

export function isKnownOptionalApplicationColumn(column: string): boolean {
  return (
    APPLICATION_KNOWN_OPTIONAL_COLUMNS.includes(column as (typeof APPLICATION_KNOWN_OPTIONAL_COLUMNS)[number]) &&
    !APPLICATION_ESSENTIAL_COLUMNS.has(column)
  );
}

export function parseMissingColumnFromPostgrestError(
  error: PostgrestLikeError,
  table: 'requests' | 'applications',
): string | null {
  if (!error?.message) return null;
  const code = error.code ?? '';
  const msg = error.message;
  const lower = msg.toLowerCase();

  const isMissingColumnCode =
    code === 'PGRST204' ||
    code === '42703' ||
    lower.includes('does not exist') ||
    lower.includes('could not find');

  if (!isMissingColumnCode) return null;

  const tablePattern = table.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  let match = lower.match(new RegExp(`column\\s+${tablePattern}\\.(\\w+)\\s+does not exist`));
  if (match?.[1]) return match[1];

  match = msg.match(new RegExp(`Could not find the '([^']+)' column of '${tablePattern}'`, 'i'));
  if (match?.[1]) return match[1];

  match = lower.match(new RegExp(`'([^']+)'\\s+column of '${tablePattern}'`));
  if (match?.[1]) return match[1];

  const known = table === 'requests' ? REQUEST_KNOWN_OPTIONAL_COLUMNS : APPLICATION_KNOWN_OPTIONAL_COLUMNS;
  for (const column of known) {
    if (lower.includes(column) && (lower.includes('column') || lower.includes('42703') || code === 'PGRST204')) {
      return column;
    }
  }

  return null;
}

export function isOptionalMissingColumnError(
  error: PostgrestLikeError,
  table: 'requests' | 'applications',
): boolean {
  const column = parseMissingColumnFromPostgrestError(error, table);
  if (!column) return false;
  return table === 'requests' ? isKnownOptionalRequestColumn(column) : isKnownOptionalApplicationColumn(column);
}

export function isAuthNetworkOrServerSelectError(error: PostgrestLikeError): boolean {
  if (!error) return false;
  const code = error.code ?? '';
  if (code === '42501' || code === 'PGRST301' || code === '401' || code === '403') return true;
  const msg = (error.message ?? '').toLowerCase();
  return (
    msg.includes('permission denied') ||
    msg.includes('jwt') ||
    msg.includes('network') ||
    msg.includes('fetch failed') ||
    msg.includes('failed to fetch')
  );
}

export function logSanitizedSelectError(
  scope: string,
  table: 'requests' | 'applications',
  error: PostgrestLikeError,
  missingColumn: string | null,
): void {
  console.error(`[LinkHelp] ${scope} select failed`, {
    table,
    code: error?.code ?? null,
    message: error?.message?.slice(0, 240) ?? null,
    missingOptionalColumn: missingColumn,
  });
}

function buildRequestColumnList(baseline: boolean): string[] {
  const cols: string[] = [...REQUEST_BASE_COLUMNS];
  if (baseline) {
    cols.push('application_count', 'service_mode');
  } else {
    cols.push('application_count');
  }
  return cols.filter((column) => !omittedRequestColumns.has(column));
}

function buildApplicationColumnList(baseline: boolean): string[] {
  const cols: string[] = [...APPLICATION_BASE_COLUMNS];
  if (baseline) cols.push(...APPLICATION_BASELINE_EXTRA_COLUMNS);
  return cols.filter((column) => !omittedApplicationColumns.has(column));
}

/** Stable SELECT when baseline optional columns are all omitted — matches current Staging schema. */
export function requestSelectStableFallback(): string {
  return buildRequestColumnList(false).join(', ');
}

export function applicationSelectStableFallback(): string {
  return buildApplicationColumnList(false).join(', ');
}

export function buildRequestSelectForEnv(baseline = isBaselineFinanceEnabled()): string {
  return buildRequestColumnList(baseline).join(', ');
}

export function buildApplicationSelectForEnv(baseline = isBaselineFinanceEnabled()): string {
  return buildApplicationColumnList(baseline).join(', ');
}

export type OptionalSelectQueryResult<T> = {
  data: T;
  error: PostgrestLikeError;
};

export async function queryWithOptionalColumnFallback<T>(
  table: 'requests' | 'applications',
  scope: string,
  runQuery: (select: string) => Promise<OptionalSelectQueryResult<T>>,
): Promise<OptionalSelectQueryResult<T>> {
  const baseline = isBaselineFinanceEnabled();
  let select = table === 'requests' ? buildRequestSelectForEnv(baseline) : buildApplicationSelectForEnv(baseline);

  for (let attempt = 0; attempt <= MAX_OPTIONAL_SELECT_RETRIES; attempt += 1) {
    const { data, error } = await runQuery(select);
    if (!error) return { data, error: null };

    if (isAuthNetworkOrServerSelectError(error)) {
      logSanitizedSelectError(scope, table, error, null);
      return { data, error };
    }

    const missingColumn = parseMissingColumnFromPostgrestError(error, table);
    const optional =
      missingColumn &&
      (table === 'requests'
        ? isKnownOptionalRequestColumn(missingColumn)
        : isKnownOptionalApplicationColumn(missingColumn));

    if (optional && missingColumn) {
      if (table === 'requests') markOptionalRequestColumnOmitted(missingColumn);
      else markOptionalApplicationColumnOmitted(missingColumn);
      select = table === 'requests' ? buildRequestSelectForEnv(baseline) : buildApplicationSelectForEnv(baseline);
      continue;
    }

    logSanitizedSelectError(scope, table, error, missingColumn);
    return { data, error };
  }

  const limitError = { code: 'OPTIONAL_SELECT_RETRY_LIMIT', message: `${scope}: optional select retry limit exceeded` };
  logSanitizedSelectError(scope, table, limitError, null);
  return { data: null as T, error: limitError };
}
