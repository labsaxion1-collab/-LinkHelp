import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useAppData } from '@/context/AppDataContext';
import { dispatchPushEvent } from '@/services/push/pushEventDispatcher';
import { ROUTES } from '@/utils/constants';

const STORAGE_PREFIX = 'linkhelp_job_reminder_';

function isTomorrow(ts: number): boolean {
  const d = new Date(ts);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return (
    d.getFullYear() === tomorrow.getFullYear() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getDate() === tomorrow.getDate()
  );
}

function dayKey(userId: string): string {
  const today = new Date().toISOString().slice(0, 10);
  return `${STORAGE_PREFIX}${userId}_${today}`;
}

/**
 * Once per day, creates in-app (and foreground push) reminders for jobs scheduled tomorrow.
 */
export function useJobReminderNotifications(): void {
  const { session, profile } = useAuth();
  const { upcomingJobs, addNotification } = useAppData();
  const firedRef = useRef(false);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || firedRef.current) return;

    try {
      if (localStorage.getItem(dayKey(userId)) === '1') return;
    } catch {
      /* ignore */
    }

    const role = profile?.role;
    const tomorrowJobs = upcomingJobs.filter(
      (u) =>
        u.workflowStatus !== 'cancelled' &&
        u.workflowStatus !== 'completed' &&
        isTomorrow(u.scheduledAt) &&
        (role === 'helper' ? u.helperId === userId : true),
    );

    if (!tomorrowJobs.length) return;

    firedRef.current = true;

    for (const job of tomorrowJobs) {
      const isHelper = role === 'helper' && job.helperId === userId;
      const title = isHelper ? 'Work scheduled tomorrow' : 'Service scheduled tomorrow';
      const message = isHelper
        ? `Tomorrow you have a job: "${job.title}".`
        : `Your service "${job.title}" is scheduled for tomorrow.`;

      addNotification({
        userId,
        type: 'job_update',
        title,
        message,
        actionUrl: isHelper ? ROUTES.helperDashboard : ROUTES.clientDashboard,
      });

      dispatchPushEvent({
        kind: 'job_reminder_tomorrow',
        userId,
        title,
        body: message,
        url: isHelper ? ROUTES.helperDashboard : ROUTES.clientDashboard,
      });
    }

    try {
      localStorage.setItem(dayKey(userId), '1');
    } catch {
      /* ignore */
    }
  }, [session?.user?.id, profile?.role, upcomingJobs, addNotification]);
}
