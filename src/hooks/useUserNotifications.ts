import { useMemo } from 'react';
import { useAppDataNotifications } from '@/context/AppDataContext';
import { getVisibleNotificationsForUser, NOTIFICATION_DISPLAY_LIMIT } from '@/utils/notificationVisibility';

export function useUserNotifications(userId: string) {
  const notifications = useAppDataNotifications();
  return useMemo(
    () => getVisibleNotificationsForUser(notifications, userId, NOTIFICATION_DISPLAY_LIMIT),
    [notifications, userId],
  );
}
