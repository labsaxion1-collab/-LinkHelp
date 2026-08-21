import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Application } from '@/types/application';
import type { Job } from '@/types/job';
import type { UpcomingJob } from '@/types/upcoming';
import {
  buildHelperCompletedHistoryList,
  filterActiveUpcomingJobs,
  isOfficiallyCompletedForReview,
  shouldDropUpcomingFromStore,
} from '@/utils/upcomingJobsPartition';
import { buildPendingServiceReviews } from '@/utils/serviceReviewQueue';
import { canShowReviewButton } from '@/utils/helperTaskCard';
import { computeClientHomeCounts } from '@/utils/accountSessionSnapshot';

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
    createdAt: 100,
    ...overrides,
  }) as Job;

const app = (overrides: Partial<Application> = {}): Application =>
  ({
    id: 'app-1',
    jobId: 'job-1',
    helperId: 'helper-1',
    clientId: 'client-1',
    helperName: 'Paulo',
    helperAvatar: '/p.png',
    helperRating: 4.8,
    helperJobs: 12,
    status: 'completed',
    createdAt: 1,
    ...overrides,
  }) as Application;

const upcoming = (overrides: Partial<UpcomingJob> = {}): UpcomingJob =>
  ({
    id: 'up-1',
    helperId: 'helper-1',
    jobId: 'job-1',
    clientName: 'Cliente',
    clientAvatar: '/c.png',
    title: 'Limpeza',
    category: 'cleaning',
    description: '',
    location: 'Montreal',
    value: '100',
    urgency: 'normal',
    scheduledAt: 200,
    workflowStatus: 'completed',
    completionRequestedAt: 150,
    reviewWindowEndsAt: null,
    createdAt: 50,
    ...overrides,
  }) as UpcomingJob;

describe('upcomingJobsPartition — helper completed history', () => {
  it('keeps completed and auto_completed in history', () => {
    const list = buildHelperCompletedHistoryList({
      helperId: 'helper-1',
      upcomingJobs: [
        upcoming({ id: 'a', jobId: 'j-a', workflowStatus: 'completed' }),
        upcoming({ id: 'b', jobId: 'j-b', workflowStatus: 'auto_completed', scheduledAt: 300 }),
      ],
      jobs: [
        job({ id: 'j-a', status: 'completed' }),
        job({ id: 'j-b', status: 'completed' }),
      ],
      applications: [],
    });
    expect(list.map((u) => u.jobId).sort()).toEqual(['j-a', 'j-b']);
  });

  it('excludes awaiting_client_confirmation and completion_requested', () => {
    const list = buildHelperCompletedHistoryList({
      helperId: 'helper-1',
      upcomingJobs: [
        upcoming({ workflowStatus: 'awaiting_client_confirmation' }),
        upcoming({ id: 'up-2', jobId: 'job-2', workflowStatus: 'completion_requested' }),
      ],
      jobs: [
        job({ status: 'in_progress' }),
        job({ id: 'job-2', status: 'in_progress' }),
      ],
      applications: [],
    });
    expect(list).toHaveLength(0);
  });

  it('does not duplicate the same request', () => {
    const list = buildHelperCompletedHistoryList({
      helperId: 'helper-1',
      upcomingJobs: [upcoming()],
      jobs: [job()],
      applications: [app()],
    });
    expect(list).toHaveLength(1);
  });

  it('includes legacy completed request without upcoming row', () => {
    const list = buildHelperCompletedHistoryList({
      helperId: 'helper-1',
      upcomingJobs: [],
      jobs: [job()],
      applications: [app()],
    });
    expect(list).toHaveLength(1);
    expect(list[0]?.jobId).toBe('job-1');
    expect(list[0]?.workflowStatus).toBe('completed');
  });

  it('filterActiveUpcomingJobs drops terminal rows for counters', () => {
    const active = filterActiveUpcomingJobs([
      upcoming({ workflowStatus: 'scheduled' }),
      upcoming({ id: 'c', jobId: 'j-c', workflowStatus: 'completed' }),
      upcoming({ id: 'd', jobId: 'j-d', workflowStatus: 'awaiting_client_confirmation' }),
    ]);
    expect(active.map((u) => u.workflowStatus)).toEqual(['scheduled', 'awaiting_client_confirmation']);
  });

  it('store filter only drops cancelled', () => {
    expect(shouldDropUpcomingFromStore('completed')).toBe(false);
    expect(shouldDropUpcomingFromStore('auto_completed')).toBe(false);
    expect(shouldDropUpcomingFromStore('cancelled')).toBe(true);
  });

  it('computeClientHomeCounts ignores completed upcoming', () => {
    const counts = computeClientHomeCounts(
      'client-1',
      [
        { id: 'j1', clientId: 'client-1', status: 'in_progress' },
        { id: 'j2', clientId: 'client-1', status: 'completed' },
      ],
      [],
      [
        { jobId: 'j1', workflowStatus: 'scheduled' },
        { jobId: 'j2', workflowStatus: 'completed' },
      ],
    );
    expect(counts.upcomingServicesCount).toBe(1);
  });
});

describe('review unlock — official completion only', () => {
  it('does not unlock on awaiting statuses', () => {
    expect(isOfficiallyCompletedForReview('in_progress', 'awaiting_client_confirmation')).toBe(false);
    expect(isOfficiallyCompletedForReview('in_progress', 'completion_requested')).toBe(false);
    expect(canShowReviewButton('awaiting_client_confirmation', 'in_progress', true)).toBe(false);
    expect(canShowReviewButton('completion_requested', 'in_progress', true)).toBe(false);
  });

  it('unlocks on completed / auto_completed', () => {
    expect(isOfficiallyCompletedForReview('completed', 'scheduled')).toBe(true);
    expect(isOfficiallyCompletedForReview('in_progress', 'completed')).toBe(true);
    expect(isOfficiallyCompletedForReview('in_progress', 'auto_completed')).toBe(true);
    expect(canShowReviewButton('completed', 'in_progress', true)).toBe(true);
    expect(canShowReviewButton('auto_completed', 'in_progress', true)).toBe(true);
  });

  it('buildPendingServiceReviews excludes awaiting and already reviewed', () => {
    const awaitingPending = buildPendingServiceReviews(
      'helper-1',
      'helper',
      [job({ status: 'in_progress' })],
      [app({ status: 'accepted' })],
      [],
      [upcoming({ workflowStatus: 'awaiting_client_confirmation' })],
    );
    expect(awaitingPending).toHaveLength(0);

    const done = buildPendingServiceReviews(
      'helper-1',
      'helper',
      [job()],
      [app()],
      [
        {
          id: 'r1',
          requestId: 'job-1',
          reviewerId: 'helper-1',
          targetUserId: 'client-1',
          rating: 5,
          comment: null,
          criteriaScores: null,
          reviewerRole: 'helper',
          createdAt: 1,
        },
      ],
      [upcoming()],
    );
    expect(done).toHaveLength(0);

    const open = buildPendingServiceReviews(
      'helper-1',
      'helper',
      [job()],
      [app()],
      [],
      [upcoming()],
    );
    expect(open).toHaveLength(1);
  });
});

describe('bloco1 wiring contracts', () => {
  it('AppData keeps completed upcoming in store', async () => {
    const ctx = await readFile(resolve('src/context/AppDataContext.tsx'), 'utf8');
    expect(ctx).toContain("if (u.workflowStatus === 'cancelled') return false");
    expect(ctx).not.toMatch(
      /if \(u\.workflowStatus === 'cancelled' \|\| u\.workflowStatus === 'completed'\) return false/,
    );
    expect(ctx).toContain("outcome: 'completed' | 'awaiting_client'");
  });

  it('HelperUpcomingJobsPage uses history builder and terminal tab switch', async () => {
    const page = await readFile(resolve('src/pages/helper/HelperUpcomingJobsPage.tsx'), 'utf8');
    expect(page).toContain('partitionHelperHistory');
    expect(page).toContain("result.outcome === 'completed'");
    expect(page).toContain('awaiting_client_note');
    expect(page).toContain('ROUTES.helperHistory');
  });

  it('ServiceReviewContext gates toast/modal with done key and reviews', async () => {
    const src = await readFile(resolve('src/context/ServiceReviewContext.tsx'), 'utf8');
    expect(src).toContain('lh_review_done_');
    expect(src).toContain('thankedToastRef');
    expect(src).toContain('myReviewedIds');
    expect(src).not.toContain('sessionStorage.removeItem(`${DISMISS_PREFIX}');
  });
});
