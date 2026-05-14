/** Stored schedule tokens from publish flow — translate for display */
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
