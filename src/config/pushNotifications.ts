/** VAPID public key — set VITE_VAPID_PUBLIC_KEY in env to enable Web Push subscribe. */
export const VAPID_PUBLIC_KEY = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined)?.trim() ?? '';

export function isWebPushConfigured(): boolean {
  return VAPID_PUBLIC_KEY.length > 0;
}

export const PUSH_SUBSCRIPTIONS_TABLE = 'push_subscriptions';
