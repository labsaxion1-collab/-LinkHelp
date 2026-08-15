import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildApplicationSelectForEnv,
  buildRequestSelectForEnv,
  isAuthNetworkOrServerSelectError,
  isKnownOptionalApplicationColumn,
  isKnownOptionalRequestColumn,
  isOptionalMissingColumnError,
  markOptionalApplicationColumnOmitted,
  markOptionalRequestColumnOmitted,
  MAX_OPTIONAL_SELECT_RETRIES,
  omittedApplicationColumnsForTests,
  omittedRequestColumnsForTests,
  parseMissingColumnFromPostgrestError,
  queryWithOptionalColumnFallback,
  REQUEST_ESSENTIAL_COLUMNS,
  resetOptionalSelectOmitCacheForTests,
} from '@/services/supabase/optionalBootstrapSelect';

vi.mock('@/config/baselineFinance', () => ({
  isBaselineFinanceEnabled: () => true,
}));

describe('optionalBootstrapSelect', () => {
  beforeEach(() => {
    resetOptionalSelectOmitCacheForTests();
  });

  it('detects PostgREST missing-column errors for requests and applications', () => {
    expect(
      parseMissingColumnFromPostgrestError(
        { code: '42703', message: 'column requests.exclusive_helper_id does not exist' },
        'requests',
      ),
    ).toBe('exclusive_helper_id');
    expect(
      parseMissingColumnFromPostgrestError(
        { code: 'PGRST204', message: "Could not find the 'application_count' column of 'requests' in the schema cache" },
        'requests',
      ),
    ).toBe('application_count');
    expect(
      parseMissingColumnFromPostgrestError(
        { code: 'PGRST204', message: "Could not find the 'lead_total_lc' column of 'applications' in the schema cache" },
        'applications',
      ),
    ).toBe('lead_total_lc');
  });

  it('retries when exclusive_helper_id is missing', async () => {
    const runQuery = vi
      .fn()
      .mockResolvedValueOnce({
        data: null,
        error: { code: '42703', message: 'column requests.exclusive_helper_id does not exist' },
      })
      .mockResolvedValueOnce({ data: [{ id: 'r1', status: 'open' }], error: null });

    const result = await queryWithOptionalColumnFallback('requests', 'test', runQuery);

    expect(runQuery).toHaveBeenCalledTimes(2);
    expect(result.error).toBeNull();
    expect(result.data).toEqual([{ id: 'r1', status: 'open' }]);
    expect(omittedRequestColumnsForTests().has('exclusive_helper_id')).toBe(true);
    expect(runQuery.mock.calls[1][0]).not.toContain('exclusive_helper_id');
  });

  it('retries when application_count is missing', async () => {
    const runQuery = vi
      .fn()
      .mockResolvedValueOnce({
        data: null,
        error: { code: '42703', message: 'column requests.application_count does not exist' },
      })
      .mockResolvedValueOnce({ data: [{ id: 'r1', status: 'open' }], error: null });

    const result = await queryWithOptionalColumnFallback('requests', 'test', runQuery);

    expect(runQuery).toHaveBeenCalledTimes(2);
    expect(result.error).toBeNull();
    expect(omittedRequestColumnsForTests().has('application_count')).toBe(true);
  });

  it('retries through multiple missing optional request columns with a bounded loop', async () => {
    const runQuery = vi.fn();
    runQuery
      .mockResolvedValueOnce({
        data: null,
        error: { code: '42703', message: 'column requests.exclusive_helper_id does not exist' },
      })
      .mockResolvedValueOnce({
        data: null,
        error: { code: '42703', message: 'column requests.application_count does not exist' },
      })
      .mockResolvedValueOnce({
        data: [
          { id: 'r1', status: 'open' },
          { id: 'r2', status: 'open' },
          { id: 'r3', status: 'open' },
        ],
        error: null,
      });

    const result = await queryWithOptionalColumnFallback('requests', 'test', runQuery);

    expect(runQuery).toHaveBeenCalledTimes(3);
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(3);
    expect(omittedRequestColumnsForTests().has('exclusive_helper_id')).toBe(true);
    expect(omittedRequestColumnsForTests().has('application_count')).toBe(true);
    expect(runQuery.mock.calls[2][0]).not.toMatch(/exclusive_helper_id|application_count/);
  });

  it('retries when lead_* application columns are missing and still returns rows', async () => {
    const runQuery = vi
      .fn()
      .mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST204', message: "Could not find the 'lead_total_lc' column of 'applications' in the schema cache" },
      })
      .mockResolvedValueOnce({ data: [{ id: 'a1', status: 'pending' }], error: null });

    const result = await queryWithOptionalColumnFallback('applications', 'test', runQuery);

    expect(runQuery).toHaveBeenCalledTimes(2);
    expect(result.error).toBeNull();
    expect(omittedApplicationColumnsForTests().has('lead_total_lc')).toBe(true);
    expect(runQuery.mock.calls[1][0]).not.toContain('lead_total_lc');
  });

  it('does not treat RLS or network errors as optional-column misses', () => {
    const rls = { code: '42501', message: 'permission denied for table requests' };
    expect(isOptionalMissingColumnError(rls, 'requests')).toBe(false);
    expect(isAuthNetworkOrServerSelectError(rls)).toBe(true);
    expect(parseMissingColumnFromPostgrestError(rls, 'requests')).toBeNull();
  });

  it('never omits essential request columns', async () => {
    for (const column of REQUEST_ESSENTIAL_COLUMNS) {
      markOptionalRequestColumnOmitted(column);
    }
    const select = buildRequestSelectForEnv(true);
    for (const column of REQUEST_ESSENTIAL_COLUMNS) {
      expect(select).toContain(column);
    }
  });

  it('uses stable fallback select when all baseline optional request columns are omitted', () => {
    markOptionalRequestColumnOmitted('exclusive_helper_id');
    markOptionalRequestColumnOmitted('application_count');
    markOptionalRequestColumnOmitted('service_mode');

    const select = buildRequestSelectForEnv(true);
    expect(select).not.toMatch(/exclusive_helper_id|application_count|service_mode/);
    expect(select).toContain('client_id');
    expect(select).toContain('status');
  });

  it('uses stable fallback select when all baseline optional application columns are omitted', () => {
    markOptionalApplicationColumnOmitted('lead_total_lc');
    markOptionalApplicationColumnOmitted('lead_debit_lc');
    markOptionalApplicationColumnOmitted('lead_service_mode');

    const select = buildApplicationSelectForEnv(true);
    expect(select).not.toMatch(/lead_total_lc|lead_debit_lc|lead_service_mode/);
    expect(select).toContain('request_id');
    expect(select).toContain('status');
  });

  it('stops after the retry limit instead of looping forever', async () => {
    const runQuery = vi.fn().mockResolvedValue({
      data: null,
      error: { code: '42703', message: 'column requests.exclusive_helper_id does not exist' },
    });

    const result = await queryWithOptionalColumnFallback('requests', 'test', runQuery);

    expect(runQuery.mock.calls.length).toBeLessThanOrEqual(MAX_OPTIONAL_SELECT_RETRIES + 1);
    expect(result.error?.code).toBe('OPTIONAL_SELECT_RETRY_LIMIT');
  });

  it('recognizes known optional columns only', () => {
    expect(isKnownOptionalRequestColumn('exclusive_helper_id')).toBe(true);
    expect(isKnownOptionalRequestColumn('client_id')).toBe(false);
    expect(isKnownOptionalApplicationColumn('lead_debit_lc')).toBe(true);
    expect(isKnownOptionalApplicationColumn('status')).toBe(false);
  });
});
