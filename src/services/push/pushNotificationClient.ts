import { isWebPushConfigured, VAPID_PUBLIC_KEY } from '@/config/pushNotifications';

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export async function getNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isPushSupported()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export async function subscribeBrowserPush(): Promise<PushSubscription | null> {
  if (!isPushSupported() || !isWebPushConfigured()) return null;
  if (Notification.permission !== 'granted') return null;

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });
}

export function showForegroundNotification(title: string, body: string, url?: string): void {
  if (!isPushSupported() || Notification.permission !== 'granted') return;
  try {
    const n = new Notification(title, {
      body,
      icon: '/icons/linkhelp-app-192.png',
      data: { url },
    });
    n.onclick = () => {
      window.focus();
      if (url) window.location.assign(url);
      n.close();
    };
  } catch {
    /* ignore — e.g. iOS Safari without full Notification ctor */
  }
}

export function subscriptionToJson(sub: PushSubscription): PushSubscriptionJSON {
  return sub.toJSON();
}
