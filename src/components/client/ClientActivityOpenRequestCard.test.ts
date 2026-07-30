import { describe, expect, it } from 'vitest';
import {
  MAX_HIRED_HELPERS_PER_REQUEST,
  activityCandidateCount,
  canAcceptApplicationForJob,
  countHiredHelpersForJob,
  isHireTeamComplete,
} from '@/utils/clientActivityApplications';
import {
  resolveClientActivityBackView,
} from '@/utils/clientActivityCardView';
import type { Application } from '@/types/application';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const app = (overrides: Partial<Application> = {}): Application => ({
  id: 'app-1',
  jobId: 'job-1',
  helperId: 'h1',
  helperName: 'Helper',
  helperAvatar: '/a.png',
  helperRating: 4.5,
  helperJobs: 3,
  status: 'pending',
  createdAt: 1,
  ...overrides,
});

describe('client activity hire capacity (single-helper architecture)', () => {
  it('caps candidate display count at 3 without implying hired slots', () => {
    const apps = [app({ id: 'a' }), app({ id: 'b' }), app({ id: 'c' }), app({ id: 'd' })];
    expect(activityCandidateCount(apps)).toBe(3);
    expect(MAX_HIRED_HELPERS_PER_REQUEST).toBe(1);
  });

  it('counts hired helpers separately from candidates', () => {
    const apps = [
      app({ id: 'a', status: 'pending' }),
      app({ id: 'b', status: 'accepted' }),
      app({ id: 'c', status: 'viewed' }),
    ];
    expect(countHiredHelpersForJob('job-1', apps)).toBe(1);
    expect(isHireTeamComplete('job-1', apps)).toBe(true);
  });

  it('allows accept only while open/paused and under capacity', () => {
    const pending = app({ status: 'pending' });
    expect(
      canAcceptApplicationForJob({
        jobStatus: 'open',
        application: pending,
        applications: [pending],
        acceptingApplicationId: null,
      }),
    ).toBe(true);

    expect(
      canAcceptApplicationForJob({
        jobStatus: 'open',
        application: pending,
        applications: [pending, app({ id: 'x', status: 'accepted' })],
        acceptingApplicationId: null,
      }),
    ).toBe(false);

    expect(
      canAcceptApplicationForJob({
        jobStatus: 'open',
        application: pending,
        applications: [pending],
        acceptingApplicationId: 'busy',
      }),
    ).toBe(false);

    expect(
      canAcceptApplicationForJob({
        jobStatus: 'in_progress',
        application: pending,
        applications: [pending],
        acceptingApplicationId: null,
      }),
    ).toBe(false);
  });
});

describe('client activity card panel navigation', () => {
  it('returns from profile to candidates and others to summary', () => {
    expect(resolveClientActivityBackView('profile')).toBe('candidates');
    expect(resolveClientActivityBackView('candidates')).toBe('summary');
    expect(resolveClientActivityBackView('description')).toBe('summary');
    expect(resolveClientActivityBackView('summary')).toBe('summary');
  });
});

describe('ClientActivityOpenRequestCard wiring', () => {
  it('uses internal panels and separate counters without sharing HelperOpportunityCard', async () => {
    const src = await readFile(
      resolve('src/components/client/ClientActivityOpenRequestCard.tsx'),
      'utf8',
    );
    expect(src).toContain('client-activity-open-card');
    expect(src).toContain('client-activity-description-view');
    expect(src).toContain('client-activity-candidates-view');
    expect(src).toContain('client-activity-profile-view');
    expect(src).toContain('client-activity-candidates-count');
    expect(src).toContain('client-activity-hired-count');
    expect(src).toContain('FEED_CARD_PREMIUM_SHELL_CLASS');
    expect(src).toContain('embedProfile={false}');
    expect(src).not.toContain('HelperOpportunityCard');
    expect(src).toContain('MAX_HIRED_HELPERS_PER_REQUEST');
  });

  it('keeps HelperOpportunityCard feed path untouched by client card import', async () => {
    const feed = await readFile(
      resolve('src/components/opportunities/HelperOpportunityCard.tsx'),
      'utf8',
    );
    expect(feed).not.toContain('ClientActivityOpenRequestCard');
    const dash = await readFile(resolve('src/pages/client/ClientDashboard.tsx'), 'utf8');
    expect(dash).toContain('ClientActivityOpenRequestCard');
    expect(dash).toContain('isPreHireActivity');
  });
});
