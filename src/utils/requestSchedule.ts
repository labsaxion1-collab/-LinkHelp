import type { Job } from '@/types/job';

export type RequestPriority = 'emergency' | 'urgent' | 'today' | 'flexible';
/** @deprecated Legacy quick-pick modes; new requests use preferredDateIso only */
export type PreferredDateMode = 'today' | 'tomorrow' | 'pick';
export type TimeWindow = 'morning' | 'afternoon' | 'evening' | '';
/** @deprecated Legacy period pick; new requests use preferredTimeSpecific only */
export type PreferredTimeChoice = TimeWindow | 'pick' | '';

/** Quick slots for beauty / aesthetics appointments */
export const BEAUTY_PREFERRED_TIME_SLOTS = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'] as const;

/** Hour-only slots for client preferred work time (HH:00) */
export const PREFERRED_WORK_HOUR_SLOTS = Array.from({ length: 15 }, (_, index) => {
  const hour = 8 + index;
  return `${String(hour).padStart(2, '0')}:00`;
});

export type RequestScheduleInput = {
  priority: RequestPriority;
  preferredDateMode?: PreferredDateMode;
  preferredDateIso: string;
  preferredTimeWindow: TimeWindow;
  preferredTimeSpecific: string;
};

function todayIso(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function tomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function resolvePreferredDateIso(input: RequestScheduleInput): string | null {
  if (input.priority === 'emergency' || input.priority === 'urgent') {
    return todayIso();
  }
  if (input.preferredDateIso) return input.preferredDateIso;
  if (input.preferredDateMode === 'today') return todayIso();
  if (input.preferredDateMode === 'tomorrow') return tomorrowIso();
  if (input.preferredDateMode === 'pick' && input.preferredDateIso) return input.preferredDateIso;
  return null;
}

/** Legacy schedule token used by matching + job cards */
export function buildJobDateLabel(input: RequestScheduleInput): string {
  if (input.priority === 'emergency') return '__now';
  if (input.priority === 'urgent') return '__today';
  if (input.priority === 'today') return '__soon';
  if (input.priority === 'flexible') return '__flexible';
  return '__flexible';
}

export function jobUrgencyFromPriority(priority: RequestPriority): 'high' | 'normal' {
  return priority === 'emergency' || priority === 'urgent' ? 'high' : 'normal';
}

export function isPreferredDateComplete(preferredDateIso: string): boolean {
  return Boolean(preferredDateIso.trim());
}

export function isPreferredTimeComplete(preferredTimeSpecific: string): boolean {
  return Boolean(preferredTimeSpecific.trim());
}

export function isScheduleStepComplete(input: RequestScheduleInput): boolean {
  if (input.priority === 'emergency') return true;
  const dateOk =
    input.priority === 'urgent' ||
    Boolean(input.preferredDateIso) ||
    input.preferredDateMode === 'today' ||
    input.preferredDateMode === 'tomorrow' ||
    (input.preferredDateMode === 'pick' && Boolean(input.preferredDateIso));
  return dateOk;
}

export function formatPreferredDateLabel(
  input: Pick<RequestScheduleInput, 'preferredDateMode' | 'preferredDateIso'>,
  t: (key: string) => string,
): string {
  if (input.preferredDateIso) {
    try {
      const d = new Date(`${input.preferredDateIso}T12:00:00`);
      return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
    } catch {
      return input.preferredDateIso;
    }
  }
  if (input.preferredDateMode === 'today') return t('create_modal.date_today');
  if (input.preferredDateMode === 'tomorrow') return t('create_modal.date_tomorrow');
  return '—';
}

export function formatPreferredPeriodLabel(
  period: string | null | undefined,
  t: (key: string) => string,
): string | null {
  if (period === 'morning') return t('create_modal.time_morning');
  if (period === 'afternoon') return t('create_modal.time_afternoon');
  if (period === 'evening') return t('create_modal.time_evening');
  return null;
}

export function formatPreferredDateTimeLabel(
  input: Pick<RequestScheduleInput, 'preferredDateMode' | 'preferredDateIso' | 'preferredTimeWindow' | 'preferredTimeSpecific'>,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  const datePart = formatPreferredDateLabel(input, t);
  const customTime = input.preferredTimeSpecific.trim();
  if (customTime) {
    return t('jobs.schedule_date_with_period', { date: datePart, period: customTime });
  }
  const periodLabel = formatPreferredPeriodLabel(input.preferredTimeWindow, t);
  if (periodLabel) {
    return t('jobs.schedule_date_with_period', { date: datePart, period: periodLabel });
  }
  return datePart;
}

type JobScheduleInput = Pick<
  Job,
  'preferredDate' | 'preferredTime' | 'preferredTimeWindow' | 'preferredPeriod' | 'timezone' | 'createdTimezone'
>;

function periodEndTime(windowKey: string): { hours: number; minutes: number; seconds: number; ms: number } {
  const key = windowKey.toLowerCase();
  if (key === 'morning' || key.includes('manh')) return { hours: 12, minutes: 0, seconds: 0, ms: 0 };
  if (key === 'afternoon' || key.includes('tarde')) return { hours: 18, minutes: 0, seconds: 0, ms: 0 };
  if (key === 'evening' || key.includes('noite')) return { hours: 23, minutes: 59, seconds: 59, ms: 999 };
  return { hours: 23, minutes: 59, seconds: 59, ms: 999 };
}

function parseExplicitTime(raw: string | null | undefined): { hours: number; minutes: number } | null {
  if (!raw?.trim()) return null;
  const match = raw.trim().match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return { hours: Number(match[1]), minutes: Number(match[2]) };
}

/**
 * Client-side mirror of DB `request_service_deadline_at` (approximate when tz differs from browser).
 * Authoritative expiry/resume blocking is enforced by `client_resume_request` / cron RPCs.
 */
export function getRequestServiceDeadlineMs(job: JobScheduleInput): number | null {
  if (!job.preferredDate) return null;

  const parts = job.preferredDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;

  const explicit = parseExplicitTime(job.preferredTime);
  const windowKey = job.preferredTimeWindow?.trim() || job.preferredPeriod?.trim() || '';
  const end = explicit
    ? { hours: explicit.hours, minutes: explicit.minutes, seconds: 59, ms: 999 }
    : periodEndTime(windowKey);

  const deadline = new Date(parts[0], parts[1] - 1, parts[2], end.hours, end.minutes, end.seconds, end.ms);
  return deadline.getTime();
}

export function isRequestServiceDeadlinePassed(job: JobScheduleInput, nowMs = Date.now()): boolean {
  const deadline = getRequestServiceDeadlineMs(job);
  if (deadline == null) return false;
  return nowMs > deadline;
}

export function canResumePausedRequest(job: JobScheduleInput, nowMs = Date.now()): boolean {
  return !isRequestServiceDeadlinePassed(job, nowMs);
}
