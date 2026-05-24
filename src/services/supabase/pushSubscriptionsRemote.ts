import { PUSH_SUBSCRIPTIONS_TABLE } from '@/config/pushNotifications';
import { getSupabase } from '@/lib/supabase';

export async function savePushSubscription(userId: string, subscription: PushSubscriptionJSON): Promise<void> {
  const sb = getSupabase();
  if (!sb || !subscription.endpoint) return;

  const { error } = await sb.from(PUSH_SUBSCRIPTIONS_TABLE).upsert(
    {
      user_id: userId,
      endpoint: subscription.endpoint,
      subscription,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' },
  );

  if (error) {
    console.warn('[push] save subscription failed', error.message);
  }
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  const sb = getSupabase();
  if (!sb || !endpoint) return;
  await sb.from(PUSH_SUBSCRIPTIONS_TABLE).delete().eq('endpoint', endpoint);
}
