import { describe, expect, it } from 'vitest';
import {
  isCompleteApplicationRow,
  isCompleteRequestRow,
  mergeApplicationRowWithApp,
  mergeRequestRowWithJob,
} from '@/services/supabase/appDataRealtimePatch';
import type { Application } from '@/types/application';
import type { Job } from '@/types/job';

const sampleJob: Job = {
  id: 'req_1',
  clientId: 'client_1',
  clientName: 'Alice',
  clientAvatar: 'https://example.com/a.png',
  clientRating: 4.5,
  title: 'Fix sink',
  category: 'plumbing',
  subcategory: null,
  description: 'Leaky sink',
  date: '',
  location: 'Montreal',
  address: null,
  city: 'Montreal',
  region: 'QC',
  postalCode: null,
  latitude: null,
  longitude: null,
  preferredDate: null,
  preferredTimeWindow: null,
  preferredTime: null,
  preferredPeriod: null,
  budgetType: 'negotiable',
  budgetAmount: null,
  currency: 'CAD',
  budgetMin: null,
  budgetMax: null,
  acceptedAmount: null,
  applicantCount: 2,
  exclusiveHelperId: null,
  value: 'CAD $100',
  urgency: 'normal',
  status: 'open',
  createdAt: 1_700_000_000_000,
};

const sampleApp: Application = {
  id: 'app_1',
  jobId: 'req_1',
  helperId: 'helper_1',
  clientId: 'client_1',
  helperName: 'Bob',
  helperAvatar: 'https://example.com/b.png',
  helperRating: 5,
  helperJobs: 3,
  helperPlan: 'BASIC',
  status: 'pending',
  createdAt: 1_700_000_100_000,
  proposedAmount: 120,
  isExclusive: false,
};

describe('appDataRealtimePatch completeness', () => {
  it('accepts full request rows', () => {
    expect(
      isCompleteRequestRow({
        id: 'req_1',
        client_id: 'client_1',
        title: 'Fix sink',
        category: 'plumbing',
        status: 'open',
        created_at: '2024-01-01T00:00:00Z',
      }),
    ).toBe(true);
  });

  it('rejects partial request rows missing title', () => {
    expect(
      isCompleteRequestRow({
        id: 'req_1',
        client_id: 'client_1',
        category: 'plumbing',
        status: 'open',
        created_at: '2024-01-01T00:00:00Z',
      }),
    ).toBe(false);
  });

  it('accepts full application rows', () => {
    expect(
      isCompleteApplicationRow({
        id: 'app_1',
        request_id: 'req_1',
        helper_id: 'helper_1',
        client_id: 'client_1',
        status: 'pending',
        created_at: '2024-01-01T00:00:00Z',
      }),
    ).toBe(true);
  });
});

describe('appDataRealtimePatch merge', () => {
  it('merges partial request UPDATE with existing job without losing card fields', () => {
    const merged = mergeRequestRowWithJob({ id: 'req_1', status: 'in_progress' }, sampleJob);
    expect(merged.title).toBe('Fix sink');
    expect(merged.client_id).toBe('client_1');
    expect(merged.status).toBe('in_progress');
    expect(merged.application_count).toBe(2);
  });

  it('merges partial application UPDATE with existing application', () => {
    const merged = mergeApplicationRowWithApp({ id: 'app_1', status: 'accepted' }, sampleApp);
    expect(merged.request_id).toBe('req_1');
    expect(merged.helper_id).toBe('helper_1');
    expect(merged.status).toBe('accepted');
    expect(merged.proposed_amount).toBe(120);
  });
});
