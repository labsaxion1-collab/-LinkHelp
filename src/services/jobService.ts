import type { Job, JobStatus } from '@/types/job';
import type { Application, ApplicationStatus } from '@/types/application';
import { mockUsers } from '@/data/mockUsers';

/** Future: replace with API calls. Pure helpers for demo data. */
export function canApplyToJob(job: Job, applications: Application[], helperId: string): boolean {
  if (job.status !== 'open') return false;
  return !applications.some((a) => a.jobId === job.id && a.helperId === helperId && a.status !== 'cancelled');
}

export function applicationsForHelper(applications: Application[], helperId: string): Application[] {
  return applications.filter((a) => a.helperId === helperId).sort((a, b) => b.createdAt - a.createdAt);
}

export function nextApplicationId(): string {
  return `app_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function demoHelperProfile() {
  return mockUsers.helper;
}

export type { ApplicationStatus, JobStatus };
