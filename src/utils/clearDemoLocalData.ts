/** Removes legacy demo seed data persisted in localStorage (safe to run on every app load). */
const DEMO_STORAGE_KEYS = [
  'linkhelp_jobs',
  'linkhelp_applications',
  'linkhelp_upcoming_jobs',
  'linkhelp_notifications',
  'linkhelp_demo_chat_thread_v1',
  'linkhelp_session_demo',
] as const;

export function clearDemoLocalData(): void {
  if (typeof window === 'undefined') return;
  for (const key of DEMO_STORAGE_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}
