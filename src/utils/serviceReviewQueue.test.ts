import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildPendingServiceReviews } from '@/utils/serviceReviewQueue';
import type { Application } from '@/types/application';
import type { Job } from '@/types/job';
import type { ServiceReview } from '@/types/review';

const job = (overrides: Partial<Job> = {}): Job =>
  ({
    id: 'job-1',
    clientId: 'client-1',
    clientName: 'Cliente',
    clientAvatar: '/c.png',
    title: 'Limpeza',
    category: 'cleaning',
    description: '',
    date: '',
    location: 'Montreal',
    value: '100',
    urgency: 'normal',
    status: 'completed',
    createdAt: 1,
    ...overrides,
  }) as Job;

const app = (overrides: Partial<Application> = {}): Application =>
  ({
    id: 'app-1',
    jobId: 'job-1',
    helperId: 'helper-1',
    helperName: 'Paulo',
    helperAvatar: '/p.png',
    helperRating: 4.8,
    helperJobs: 12,
    status: 'completed',
    createdAt: 1,
    ...overrides,
  }) as Application;

const review = (overrides: Partial<ServiceReview> = {}): ServiceReview => ({
  id: 'rev-1',
  requestId: 'job-1',
  reviewerId: 'client-1',
  targetUserId: 'helper-1',
  rating: 5,
  comment: 'ok',
  criteriaScores: null,
  reviewerRole: 'client',
  createdAt: 2,
  ...overrides,
});

describe('buildPendingServiceReviews', () => {
  it('excludes requests the current user already reviewed', () => {
    const pending = buildPendingServiceReviews(
      'client-1',
      'client',
      [job()],
      [app()],
      [review()],
      [],
    );
    expect(pending).toHaveLength(0);
  });

  it('includes completed jobs only when the current user has not reviewed', () => {
    const pending = buildPendingServiceReviews(
      'client-1',
      'client',
      [job()],
      [app()],
      [],
      [],
    );
    expect(pending).toHaveLength(1);
    expect(pending[0]?.requestId).toBe('job-1');
    expect(pending[0]?.targetUserId).toBe('helper-1');
  });

  it('does not confuse helper and client review authorship', () => {
    const pending = buildPendingServiceReviews(
      'client-1',
      'client',
      [job()],
      [app()],
      [review({ reviewerId: 'helper-1', reviewerRole: 'helper', targetUserId: 'client-1' })],
      [],
    );
    expect(pending).toHaveLength(1);
  });
});

describe('reviews hydration wiring', () => {
  it('gates pending queue and auto-open on reviewsLoaded', async () => {
    const ctx = await readFile(resolve('src/context/AppDataContext.tsx'), 'utf8');
    expect(ctx).toContain('reviewsLoaded');
    expect(ctx).toContain('userId && reviewsLoaded');
    expect(ctx).toContain('refreshReviews');
    expect(ctx).toContain('setReviewsLoaded(false)');
    expect(ctx).not.toMatch(/scheduleIdle\([\s\S]{0,120}fetchRemoteReviews/);

    const provider = await readFile(resolve('src/context/ServiceReviewContext.tsx'), 'utf8');
    expect(provider).toContain('reviewsLoaded');
    expect(provider).toContain('if (!reviewsLoaded || active || viewing');
    expect(provider).toContain('ALREADY_REVIEWED');
    expect(provider).toContain('refreshReviews');
    expect(provider).toContain('openSubmittedReviewByRequestId');
    expect(provider).toContain('SubmittedReviewModal');
  });

  it('ships submitted review consult modal without inventing an update RPC', async () => {
    const modal = await readFile(
      resolve('src/components/reviews/SubmittedReviewModal.tsx'),
      'utf8',
    );
    expect(modal).toContain('submitted-review-modal');
    expect(modal).toContain('service_review.edit_review');
    const remote = await readFile(resolve('src/services/supabase/reviewsRemote.ts'), 'utf8');
    expect(remote).toContain('submit_service_review');
    expect(remote).not.toContain('update_service_review');
  });

  it('completed history opens in-card profile and drops Ver detalhes', async () => {
    const client = await readFile(
      resolve('src/components/client/ClientCompletedHistoryCard.tsx'),
      'utf8',
    );
    expect(client).toContain('completed-helper-profile-panel');
    expect(client).toContain('CandidateHelperProfileExpand');
    expect(client).toContain('FEED_CARD_STANDARD_CONTENT_HEIGHT_PX');
    expect(client).not.toContain('history_view_details');
    expect(client).not.toContain('onOpenDetails');
    expect(client).toContain('onViewSubmittedReview');

    const helper = await readFile(
      resolve('src/components/helpers/HelperCompletedHistoryCard.tsx'),
      'utf8',
    );
    expect(helper).toContain('FeedCardClientProfilePanel');
    expect(helper).toContain('helper-completed-client-profile-panel');
    expect(helper).not.toContain('onOpenChat');
  });
});
