import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { isWebPushConfigured } from '@/config/pushNotifications';
import {
  getNotificationPermission,
  isPushSupported,
  requestNotificationPermission,
  subscribeBrowserPush,
  subscriptionToJson,
} from '@/services/push/pushNotificationClient';
import { savePushSubscription } from '@/services/supabase/pushSubscriptionsRemote';

export function usePushNotifications() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported' | 'loading'>('loading');
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getNotificationPermission().then((p) => {
      if (!cancelled) setPermission(p);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const enablePush = useCallback(async (): Promise<boolean> => {
    if (!userId || !isPushSupported()) return false;
    setSubscribing(true);
    try {
      const perm = await requestNotificationPermission();
      setPermission(perm);
      if (perm !== 'granted') return false;

      const sub = await subscribeBrowserPush();
      if (!sub) return perm === 'granted' && !isWebPushConfigured();

      await savePushSubscription(userId, subscriptionToJson(sub));
      return true;
    } finally {
      setSubscribing(false);
    }
  }, [userId]);

  return {
    supported: isPushSupported(),
    configured: isWebPushConfigured(),
    permission,
    subscribing,
    enablePush,
  };
}
