import type { AppNotification } from '@/types/notification';

export function nextNotificationId(): string {
  return `notif_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function unreadCount(notifications: AppNotification[], userId: string): number {
  return notifications.filter((n) => n.userId === userId && !n.read).length;
}
