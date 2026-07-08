import type { Job } from '@/types/job';
import type { UpcomingJob } from '@/types/upcoming';

/** Copy subcategory from the linked request when upcoming_jobs has no column for it. */
export function enrichUpcomingJobsWithSubcategories(upcoming: UpcomingJob[], jobs: Job[]): UpcomingJob[] {
  if (upcoming.length === 0 || jobs.length === 0) return upcoming;
  const subByRequestId = new Map(jobs.map((j) => [j.id, j.subcategory ?? null]));
  return upcoming.map((row) => {
    if (row.subcategory) return row;
    const subcategory = subByRequestId.get(row.jobId) ?? null;
    return subcategory ? { ...row, subcategory } : row;
  });
}

/** Minimal shape — avoids circular imports with AppDataContext */
export function estimateScheduledAtFromJob(job: { date: string }): number {
  const now = Date.now();
  const d = job.date;

  if (d === '__now') return now + 2 * 3600000;
  if (d === '__today') return now + 5 * 3600000;
  if (d === '__soon') return now + 28 * 3600000;
  if (d === '__flexible') return now + 4 * 86400000;

  const t = new Date();
  const hm = d.match(/(\d{1,2}):(\d{2})/);
  const hour = hm ? Math.min(23, parseInt(hm[1], 10)) : 14;
  const min = hm ? Math.min(59, parseInt(hm[2], 10)) : 0;
  t.setHours(hour, min, 0, 0);

  const lower = d.toLowerCase();
  if (lower.includes('amanh')) {
    t.setDate(t.getDate() + 1);
  } else if (/sexta|friday/i.test(d)) {
    const day = t.getDay();
    const add = ((5 - day + 7) % 7) || 7;
    t.setDate(t.getDate() + add);
  } else if (lower.includes('hoje') || lower.includes('today')) {
    if (t.getTime() < now - 60000) t.setDate(t.getDate() + 1);
  } else {
    if (t.getTime() < now) t.setDate(t.getDate() + 1);
  }

  return t.getTime();
}

export function formatScheduledClock(scheduledAt: number, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(scheduledAt));
  } catch {
    return new Date(scheduledAt).toLocaleTimeString();
  }
}

export function formatScheduledDay(scheduledAt: number, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(new Date(scheduledAt));
  } catch {
    return new Date(scheduledAt).toLocaleDateString();
  }
}
