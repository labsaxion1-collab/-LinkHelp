import type { AppNotification } from '@/types/notification';

export const NOTIFICATION_DISPLAY_LIMIT = 30;

const CLEARED_AT_KEY = (userId: string) => `lh:notifications-cleared-at:${userId}`;

const BLOCKED_TITLE_FRAGMENTS = [
  'application update',
  'application declined',
  'application withdrawn',
  'application cancelled',
  'candidatura cancelada',
  'work scheduled tomorrow',
  'service scheduled tomorrow',
  'reschedule',
  'task update',
  'você curtiu uma ideia',
  'ideia enviada',
];

const ALLOWED_TITLE_FRAGMENTS = [
  'new application',
  'nova candidatura',
  'application accepted',
  'candidatura aceita',
  'official hire',
  'contratação oficial',
  'contratação confirmada',
  'helper hired',
  'helper contratado',
  'new message',
  'nova mensagem',
  'service completed',
  'trabalho concluído',
  'work completed',
  'review received',
  'avaliação recebida',
  'rating received',
  'request cancelled',
  'chamado cancelado',
];

function isRequestCancelledNotification(title: string, message: string): boolean {
  const normalizedTitle = title.toLowerCase();
  const normalizedMessage = message.toLowerCase();
  if (normalizedTitle.includes('application cancelled') || normalizedTitle.includes('candidatura cancelada')) {
    return false;
  }
  return (
    normalizedTitle.includes('request cancelled') ||
    normalizedTitle.includes('chamado cancelado') ||
    normalizedMessage.includes('cancelled the request') ||
    normalizedMessage.includes('cancelou o chamado') ||
    normalizedMessage.includes('your request') && normalizedMessage.includes('cancelled') ||
    normalizedMessage.includes('seu pedido') && normalizedMessage.includes('cancelado')
  );
}

export function getNotificationsClearedAt(userId: string): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CLEARED_AT_KEY(userId));
    if (!raw) return null;
    const ts = Number(raw);
    return Number.isFinite(ts) ? ts : null;
  } catch {
    return null;
  }
}

export function markNotificationsCleared(userId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CLEARED_AT_KEY(userId), String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function isAllowedNotification(notification: AppNotification): boolean {
  const title = notification.title.trim().toLowerCase();
  const message = notification.message.trim().toLowerCase();

  if (isRequestCancelledNotification(title, message)) {
    return true;
  }

  if (notification.type === 'job_update' || notification.type === 'payment' || notification.type === 'system') {
    return false;
  }

  if (BLOCKED_TITLE_FRAGMENTS.some((part) => title.includes(part) || message.includes(part))) {
    return false;
  }

  if (notification.type === 'message') return true;

  if (ALLOWED_TITLE_FRAGMENTS.some((part) => title.includes(part))) {
    return true;
  }

  if (notification.type === 'application') {
    return (
      title.includes('new application') ||
      title.includes('nova candidatura') ||
      title.includes('accepted') ||
      title.includes('aceita') ||
      title.includes('official hire') ||
      title.includes('contratação') ||
      title.includes('helper hired') ||
      title.includes('helper contratado')
    );
  }

  return false;
}

function dedupeNotifications(list: AppNotification[]): AppNotification[] {
  const seen = new Set<string>();
  const out: AppNotification[] = [];
  for (const item of list) {
    const key = `${item.type}|${item.title.trim().toLowerCase()}|${item.message.trim().toLowerCase().slice(0, 96)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function getVisibleNotificationsForUser(
  notifications: AppNotification[],
  userId: string,
  limit = NOTIFICATION_DISPLAY_LIMIT,
): AppNotification[] {
  const clearedAt = getNotificationsClearedAt(userId);
  const filtered = notifications.filter((n) => {
    if (n.userId !== userId) return false;
    if (clearedAt != null && n.createdAt <= clearedAt) return false;
    return isAllowedNotification(n);
  });

  return dedupeNotifications(filtered)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}
