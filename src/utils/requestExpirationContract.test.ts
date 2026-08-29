import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizeRequestStatus, resolveRequestStatusPatch } from '@/utils/statusNormalize';
import { isJobExpired } from '@/utils/jobVisibility';
import { requestRowToJob } from '@/services/supabase/mappers';
import type { RequestRow } from '@/types/database';
import type { Job } from '@/types/job';
import {
  partitionHelperHistory,
  isRequestExpiredForHistory,
} from '@/utils/helperHistoryBuckets';
import type { Application } from '@/types/application';
import type { UpcomingJob } from '@/types/upcoming';
import { mergeRequestRowWithJob } from '@/services/supabase/appDataRealtimePatch';
import { emptyMapperProfile } from '@/services/supabase/appDataRemote';
import {
  buildRequestSelectForEnv,
  isKnownOptionalRequestColumn,
  markOptionalRequestColumnOmitted,
  resetOptionalSelectOmitCacheForTests,
} from '@/services/supabase/optionalBootstrapSelect';

const helperId = 'helper-1';
const NOW = new Date('2026-08-20T12:00:00Z').getTime();
const FUTURE = NOW + 7 * 24 * 60 * 60 * 1000;
const PAST = NOW - 24 * 60 * 60 * 1000;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

const job = (overrides: Partial<Job> = {}): Job =>
  ({
    id: 'job-1',
    clientId: 'client-1',
    clientName: 'Client',
    clientAvatar: '/c.png',
    title: 'Tradução',
    category: 'translation',
    description: '',
    date: '',
    location: 'Montreal',
    value: 'CAD $80',
    urgency: 'normal',
    status: 'open',
    createdAt: NOW - 60_000,
    preferredDate: null,
    expiresAt: FUTURE,
    ...overrides,
  }) as Job;

const app = (overrides: Partial<Application> = {}): Application =>
  ({
    id: 'app-1',
    jobId: 'job-1',
    helperId,
    clientId: 'client-1',
    helperName: 'Help',
    helperAvatar: '/h.png',
    helperRating: 5,
    helperJobs: 1,
    status: 'pending',
    createdAt: NOW - 30_000,
    ...overrides,
  }) as Application;

function baseRequestRow(overrides: Partial<RequestRow> = {}): RequestRow {
  return {
    id: 'r1',
    client_id: 'c1',
    title: 'Job',
    description: 'Desc',
    category: 'cleaning',
    subcategory: null,
    urgency: 'normal',
    budget: null,
    location: 'Montreal',
    address: null,
    city: null,
    region: null,
    postal_code: null,
    latitude: null,
    longitude: null,
    preferred_date: null,
    preferred_time_window: null,
    preferred_time: null,
    budget_type: null,
    budget_amount: null,
    currency: 'CAD',
    budget_min: null,
    budget_max: null,
    accepted_amount: null,
    application_count: 0,
    exclusive_helper_id: null,
    status: 'open',
    expires_at: '2026-08-27T12:00:00Z',
    created_at: '2026-08-20T12:00:00Z',
    updated_at: '2026-08-20T12:00:00Z',
    ...overrides,
  };
}

describe('normalizeRequestStatus — expired contract', () => {
  it('preserves raw expired and never maps it to open', () => {
    expect(normalizeRequestStatus('expired')).toBe('expired');
    expect(normalizeRequestStatus('EXPIRED')).toBe('expired');
    expect(normalizeRequestStatus('expired')).not.toBe('open');
  });

  it('keeps expired terminal against realtime open patches', () => {
    expect(resolveRequestStatusPatch('expired', 'open')).toBe('expired');
    expect(resolveRequestStatusPatch('expired', 'paused')).toBe('expired');
  });
});

describe('requestRowToJob — expires_at / expired', () => {
  it('maps status expired and expiresAt from expires_at', () => {
    const mapped = requestRowToJob(
      baseRequestRow({ status: 'expired', expires_at: '2026-08-19T12:00:00Z' }),
      emptyMapperProfile(),
    );
    expect(mapped.status).toBe('expired');
    expect(mapped.expiresAt).toBe(Date.parse('2026-08-19T12:00:00Z'));
  });

  it('keeps null expiresAt when column is absent', () => {
    const mapped = requestRowToJob(baseRequestRow({ expires_at: null }), emptyMapperProfile());
    expect(mapped.expiresAt).toBeNull();
    expect(mapped.status).toBe('open');
  });
});

describe('isJobExpired — authoritative listing TTL', () => {
  it('treats explicit status expired as expired even without expiresAt', () => {
    expect(isJobExpired(job({ status: 'expired', expiresAt: null }), NOW)).toBe(true);
  });

  it('treats past expiresAt as expired while status is still open', () => {
    expect(isJobExpired(job({ status: 'open', expiresAt: PAST }), NOW)).toBe(true);
  });

  it('keeps future expiresAt active', () => {
    expect(isJobExpired(job({ status: 'open', expiresAt: FUTURE }), NOW)).toBe(false);
  });

  it('does not expire open jobs with past preferredDate when expiresAt is still future', () => {
    expect(
      isJobExpired(
        job({ status: 'open', preferredDate: '2020-01-01', expiresAt: FUTURE }),
        NOW,
      ),
    ).toBe(false);
  });

  it('uses preferredDate legacy fallback only when expiresAt is absent', () => {
    expect(
      isJobExpired(job({ status: 'open', preferredDate: '2020-01-01', expiresAt: null }), NOW),
    ).toBe(true);
    expect(
      isJobExpired(job({ status: 'open', preferredDate: '2099-01-01', expiresAt: null }), NOW),
    ).toBe(false);
  });

  it('does not reclassify hired or completed via dates', () => {
    expect(isJobExpired(job({ status: 'in_progress', expiresAt: PAST }), NOW)).toBe(false);
    expect(isJobExpired(job({ status: 'completed', expiresAt: PAST }), NOW)).toBe(false);
  });
});

describe('partitionHelperHistory — expiration buckets', () => {
  it('moves status expired pending applications to history only', () => {
    const result = partitionHelperHistory({
      helperId,
      applications: [app({ status: 'pending' })],
      jobs: [job({ status: 'expired', expiresAt: null })],
      upcomingJobs: [],
    });
    expect(result.activeApplications.map((a) => a.id)).toEqual([]);
    expect(result.applicationHistory.map((a) => a.id)).toEqual(['app-1']);
    expect(isRequestExpiredForHistory(job({ status: 'expired' }), NOW)).toBe(true);
  });

  it('moves open + past expiresAt pending applications to history', () => {
    const result = partitionHelperHistory({
      helperId,
      applications: [app({ status: 'viewed' })],
      jobs: [job({ status: 'open', expiresAt: PAST })],
      upcomingJobs: [],
    });
    expect(result.activeApplications).toEqual([]);
    expect(result.applicationHistory.map((a) => a.id)).toEqual(['app-1']);
  });

  it('keeps open + future expiresAt in active applications', () => {
    const result = partitionHelperHistory({
      helperId,
      applications: [app({ status: 'pending' })],
      jobs: [job({ status: 'open', expiresAt: FUTURE, preferredDate: '2020-01-01' })],
      upcomingJobs: [],
    });
    expect(result.activeApplications.map((a) => a.id)).toEqual(['app-1']);
    expect(result.applicationHistory).toEqual([]);
  });

  it('legacy preferredDate without expiresAt still goes to history', () => {
    const result = partitionHelperHistory({
      helperId,
      applications: [app({ status: 'pending' })],
      jobs: [job({ status: 'open', preferredDate: '2020-01-01', expiresAt: null })],
      upcomingJobs: [],
    });
    expect(result.activeApplications).toEqual([]);
    expect(result.applicationHistory.map((a) => a.id)).toEqual(['app-1']);
  });

  it('never duplicates between activities and history for expired listing', () => {
    const result = partitionHelperHistory({
      helperId,
      applications: [app({ id: 'a1', status: 'pending' }), app({ id: 'a2', status: 'viewed' })],
      jobs: [job({ status: 'expired' })],
      upcomingJobs: [] as UpcomingJob[],
    });
    const ids = [
      ...result.activeApplications.map((a) => a.id),
      ...result.applicationHistory.map((a) => a.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
    expect(result.activeApplications).toEqual([]);
    expect(ids.sort()).toEqual(['a1', 'a2']);
  });
});

describe('bootstrap/realtime preserve expiresAt', () => {
  it('includes expires_at in request select and marks it optional for legacy schemas', () => {
    resetOptionalSelectOmitCacheForTests();
    expect(isKnownOptionalRequestColumn('expires_at')).toBe(true);
    expect(buildRequestSelectForEnv(false)).toContain('expires_at');
    markOptionalRequestColumnOmitted('expires_at');
    expect(buildRequestSelectForEnv(false)).not.toContain('expires_at');
    resetOptionalSelectOmitCacheForTests();
  });

  it('mergeRequestRowWithJob preserves expires_at from existing Job', () => {
    const merged = mergeRequestRowWithJob({ id: 'job-1', status: 'open' }, job({ expiresAt: FUTURE }));
    expect(merged.expires_at).toBe(new Date(FUTURE).toISOString());
    expect(merged.status).toBe('open');
  });

  it('mergeRequestRowWithJob does not reopen expired status', () => {
    const merged = mergeRequestRowWithJob(
      { id: 'job-1', status: 'open' },
      job({ status: 'expired', expiresAt: PAST }),
    );
    expect(merged.status).toBe('expired');
  });
});
