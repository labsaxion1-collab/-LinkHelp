import { describe, expect, it } from 'vitest';
import type { Application } from '@/types/application';
import type { Job } from '@/types/job';
import {
  buildHelperCategoryExperience,
  candidateProfileExpandKey,
  formatMemberDuration,
} from '@/utils/candidateProfileExpand';

const baseJob = (overrides: Partial<Job> = {}): Job => ({
  id: 'job-1',
  clientId: 'client-1',
  clientName: 'Client',
  clientAvatar: '',
  title: 'Clean',
  category: 'cleaning',
  description: 'Desc',
  date: 'Today',
  location: 'Montreal',
  value: '$100',
  urgency: 'normal',
  status: 'completed',
  createdAt: Date.now(),
  ...overrides,
});

const baseApp = (overrides: Partial<Application> = {}): Application => ({
  id: 'app-1',
  jobId: 'job-1',
  helperId: 'helper-1',
  clientId: 'client-1',
  helperName: 'Alex',
  helperAvatar: '',
  helperRating: 4.8,
  helperJobs: 12,
  status: 'completed',
  createdAt: Date.now(),
  ...overrides,
});

describe('candidateProfileExpand', () => {
  it('builds category experience counts from completed applications', () => {
    const jobs = [
      baseJob({ id: 'job-1', category: 'cleaning' }),
      baseJob({ id: 'job-2', category: 'moving' }),
      baseJob({ id: 'job-3', category: 'cleaning' }),
    ];
    const apps = [
      baseApp({ jobId: 'job-1', status: 'completed' }),
      baseApp({ id: 'app-2', jobId: 'job-2', status: 'completed' }),
      baseApp({ id: 'app-3', jobId: 'job-3', status: 'completed' }),
      baseApp({ id: 'app-4', jobId: 'job-1', status: 'pending' }),
    ];
    const experience = buildHelperCategoryExperience('helper-1', apps, jobs);
    expect(experience).toEqual([
      { categoryId: 'cleaning', count: 2 },
      { categoryId: 'moving', count: 1 },
    ]);
  });

  it('formats member duration in years, months, or days', () => {
    const t = (key: string, vars?: Record<string, string | number>) =>
      `${key}:${String(vars?.count ?? '')}`;
    const now = Date.now();
    expect(formatMemberDuration(now - 400 * 86_400_000, t)).toBe(
      'candidate_profile.member_for_years:1',
    );
    expect(formatMemberDuration(now - 60 * 86_400_000, t)).toBe(
      'candidate_profile.member_for_months:2',
    );
    expect(formatMemberDuration(now - 14 * 86_400_000, t)).toBe(
      'candidate_profile.member_for_days:14',
    );
  });

  it('creates stable expand keys per job and application', () => {
    expect(candidateProfileExpandKey('job-a', 'app-b')).toBe('job-a:app-b');
  });
});
