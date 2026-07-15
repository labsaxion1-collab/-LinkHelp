import { describe, expect, it } from 'vitest';
import type { Application } from '@/types/application';
import {
  findHiredApplicationForJob,
  isHiredActivityJob,
  isPreHireActivityJob,
  listCandidateApplicationsForJob,
} from '@/utils/clientActivityApplications';

const baseApp = (overrides: Partial<Application>): Application => ({
  id: 'app-1',
  jobId: 'job-1',
  helperId: 'helper-1',
  helperName: 'Helper One',
  helperAvatar: '/a.png',
  helperRating: 4.8,
  helperJobs: 12,
  status: 'pending',
  createdAt: 1,
  ...overrides,
});

describe('clientActivityApplications', () => {
  it('classifies pre-hire and hired statuses', () => {
    expect(isPreHireActivityJob('open')).toBe(true);
    expect(isPreHireActivityJob('paused')).toBe(true);
    expect(isHiredActivityJob('in_progress')).toBe(true);
    expect(isHiredActivityJob('completed')).toBe(true);
  });

  it('lists only pending/viewed candidates', () => {
    const apps = [
      baseApp({ id: 'a', status: 'pending' }),
      baseApp({ id: 'b', status: 'viewed' }),
      baseApp({ id: 'c', status: 'accepted' }),
      baseApp({ id: 'd', status: 'completed' }),
    ];
    expect(listCandidateApplicationsForJob('job-1', apps).map((a) => a.id)).toEqual(['a', 'b']);
  });

  it('finds hired helper via completed application', () => {
    const apps = [baseApp({ status: 'completed' })];
    expect(findHiredApplicationForJob({ id: 'job-1' }, apps, [])?.status).toBe('completed');
  });

  it('falls back to upcoming job helper when status not accepted yet', () => {
    const apps = [baseApp({ status: 'viewed', helperId: 'helper-99' })];
    const upcoming = [
      {
        id: 'u1',
        helperId: 'helper-99',
        jobId: 'job-1',
        clientName: 'Client',
        clientAvatar: '',
        title: 'Job',
        category: 'cleaning',
        description: '',
        location: '',
        value: '100',
        urgency: 'normal' as const,
        scheduledAt: 1,
        workflowStatus: 'in_progress' as const,
        completionRequestedAt: null,
        reviewWindowEndsAt: null,
        createdAt: 1,
      },
    ];
    expect(findHiredApplicationForJob({ id: 'job-1' }, apps, upcoming)?.helperId).toBe('helper-99');
  });
});
