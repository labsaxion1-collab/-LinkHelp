/** Stored schedule tokens from publish flow — translate for display */
import type { Job } from '@/types/job';

const SCHEDULE_KEYS: Record<string, string> = {
  __now: 'jobs.date_now',
  __today: 'jobs.date_today',
  __soon: 'jobs.date_soon',
  __flexible: 'jobs.date_flexible',
};

export function formatJobSchedule(date: string, t: (key: string) => string): string {
  const key = SCHEDULE_KEYS[date];
  return key ? t(key) : date;
}

function formatPreferredDateFromIso(iso: string, t: (key: string) => string): string {
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowIso = tomorrow.toISOString().slice(0, 10);
  if (iso === today) return t('create_modal.date_today');
  if (iso === tomorrowIso) return t('create_modal.date_tomorrow');
  try {
    const d = new Date(`${iso}T12:00:00`);
    return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  } catch {
    return iso;
  }
}

function formatPeriodFromJob(
  job: Pick<Job, 'preferredPeriod' | 'preferredTimeWindow'>,
  t: (key: string) => string,
): string | null {
  const period = job.preferredPeriod ?? job.preferredTimeWindow;
  if (period === 'morning') return t('create_modal.time_morning');
  if (period === 'afternoon') return t('create_modal.time_afternoon');
  if (period === 'evening') return t('create_modal.time_evening');
  return null;
}

/** Client/helper cards: show date + period or exact time (e.g. "Hoje · Manhã") */
export function formatJobScheduleDisplay(
  job: Pick<Job, 'date' | 'preferredDate' | 'preferredTime' | 'preferredPeriod' | 'preferredTimeWindow' | 'category'>,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  const datePart = job.preferredDate
    ? formatPreferredDateFromIso(job.preferredDate, t)
    : formatJobSchedule(job.date, t);
  const exactTime = job.preferredTime?.trim();
  if (exactTime) {
    return t('jobs.schedule_date_with_period', { date: datePart, period: exactTime });
  }
  const periodLabel = formatPeriodFromJob(job, t);
  if (periodLabel) {
    return t('jobs.schedule_date_with_period', { date: datePart, period: periodLabel });
  }
  return datePart;
}

export function isBeautyScheduledJob(job: Pick<Job, 'category' | 'preferredTime'>): boolean {
  return job.category === 'beauty' && Boolean(job.preferredTime?.trim());
}
