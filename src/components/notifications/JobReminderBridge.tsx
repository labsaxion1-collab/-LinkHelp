import { useJobReminderNotifications } from '@/hooks/useJobReminderNotifications';

/** Runs daily job reminders inside AppDataProvider tree. */
export function JobReminderBridge() {
  useJobReminderNotifications();
  return null;
}
