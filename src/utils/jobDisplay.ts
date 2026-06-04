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

const OPEN_WINDOW_MS = 24 * 60 * 60 * 1000;

/** When the request was opened (system `created_at`) — not the client's desired service time. */
export function formatJobOpenedAt(
  createdAtMs: number,
  t: (key: string, vars?: Record<string, string | number>) => string,
  locale = 'pt-BR',
): string {
  if (!Number.isFinite(createdAtMs) || createdAtMs <= 0) return '';

  const ageMs = Math.max(0, Date.now() - createdAtMs);
  const opened = new Date(createdAtMs);
  const now = new Date();

  if (ageMs >= OPEN_WINDOW_MS) {
    const date = opened.toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    return t('jobs.opened_on_date', { date });
  }

  const ageHours = Math.floor(ageMs / (60 * 60 * 1000));
  const ageMinutes = Math.max(1, Math.floor(ageMs / (60 * 1000)));
  const sameDay = opened.toDateString() === now.toDateString();

  if (sameDay && ageHours >= 1) {
    const time = opened.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    return t('jobs.opened_today_at', { time });
  }

  if (ageHours >= 1) {
    return t('jobs.opened_ago_hours', { count: ageHours });
  }

  return t('jobs.opened_ago_minutes', { count: ageMinutes });
}
