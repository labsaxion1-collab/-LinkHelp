import { showForegroundNotification } from '@/services/push/pushNotificationClient';

/** In-app / foreground notification types — server web-push can mirror these payloads later. */
export type PushEventKind =
  | 'helper_applied'
  | 'helper_accepted'
  | 'helper_rejected'
  | 'new_message'
  | 'service_confirmed';

export type PushEventPayload = {
  title: string;
  body: string;
  url?: string;
  userId?: string;
  kind: PushEventKind;
};

/**
 * Shows a local notification when permission is granted.
 * Persisted subscriptions are sent from a backend edge function (not wired here).
 */
export function dispatchPushEvent(payload: PushEventPayload): void {
  showForegroundNotification(payload.title, payload.body, payload.url);
}
