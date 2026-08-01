import { describe, expect, it, beforeEach } from 'vitest';
import {
  isMissingApplicationCountColumnError,
  markRequestsOmitApplicationCount,
  requestSelectForEnv,
  resetRequestSelectApplicationCountCacheForTests,
  REQUEST_SELECT_CORE,
  REQUEST_SELECT_WITH_APPLICATION_COUNT,
} from '@/services/supabase/appDataRemote';

describe('requestSelectForEnv — application_count compatibility', () => {
  beforeEach(() => {
    resetRequestSelectApplicationCountCacheForTests();
  });

  it('includes application_count by default', () => {
    const select = requestSelectForEnv();
    expect(select).toContain('application_count');
    expect(REQUEST_SELECT_WITH_APPLICATION_COUNT).toContain('application_count');
  });

  it('detects missing-column PostgREST errors', () => {
    expect(
      isMissingApplicationCountColumnError({
        message: 'column requests.application_count does not exist',
        code: '42703',
      }),
    ).toBe(true);
    expect(isMissingApplicationCountColumnError({ message: 'permission denied' })).toBe(false);
  });

  it('omits application_count after staging schema miss is marked', () => {
    markRequestsOmitApplicationCount();
    const select = requestSelectForEnv();
    expect(select).not.toContain('application_count');
    expect(select).toContain('exclusive_helper_id');
    expect(REQUEST_SELECT_CORE).not.toContain('application_count');
  });
});
