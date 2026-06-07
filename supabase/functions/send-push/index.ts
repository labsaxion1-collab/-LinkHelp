/**
 * Web Push sender — VAPID via npm:web-push
 *
 * Accepts two payload formats:
 *
 * 1. Direct call (test page, future server calls):
 *    POST { userId: string, title: string, body?: string, url?: string }
 *
 * 2. Supabase Database Webhook (fired on push_notification_queue INSERT):
 *    POST { type: "INSERT", table: "push_notification_queue", record: { user_id, title, body, url } }
 *
 * Secrets (set in Supabase Dashboard → Edge Functions → send-push → Secrets):
 *   VAPID_PRIVATE_KEY  — base64url P-256 private key
 *   VAPID_PUBLIC_KEY   — base64url P-256 public key (must match VITE_VAPID_PUBLIC_KEY)
 *   VAPID_SUBJECT      — mailto: or https: URI  (default: mailto:support@linkhelp.ca)
 *   SUPABASE_URL       — auto-injected by Supabase runtime
 *   SUPABASE_SERVICE_ROLE_KEY — auto-injected by Supabase runtime
 */
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface DirectPayload {
  userId: string;
  title: string;
  body?: string;
  url?: string;
}

interface WebhookRecord {
  id: string;
  user_id: string;
  title: string;
  body: string;
  url: string;
}

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: WebhookRecord | null;
  old_record: WebhookRecord | null;
}

type IncomingPayload = DirectPayload | WebhookPayload;

function isWebhookPayload(p: IncomingPayload): p is WebhookPayload {
  return 'type' in p && 'record' in p;
}

function extractTarget(payload: IncomingPayload): { userId: string; title: string; body: string; url: string } | null {
  if (isWebhookPayload(payload)) {
    if (payload.type !== 'INSERT' || !payload.record) return null;
    const r = payload.record;
    return {
      userId: r.user_id,
      title:  r.title,
      body:   r.body  ?? '',
      url:    r.url   ?? '/',
    };
  }
  if (!payload.userId || !payload.title) return null;
  return {
    userId: payload.userId,
    title:  payload.title,
    body:   payload.body  ?? '',
    url:    payload.url   ?? '/',
  };
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const privateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const publicKey  = Deno.env.get('VAPID_PUBLIC_KEY');
    const subject    = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:support@linkhelp.ca';

    if (!privateKey || !publicKey) {
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured' }),
        { status: 501, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);

    const rawPayload = await req.json() as IncomingPayload;
    const target = extractTarget(rawPayload);

    if (!target) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId/user_id and title' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }

    const sb = createClient(
      Deno.env.get('SUPABASE_URL')              ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: rows, error } = await sb
      .from('push_subscriptions')
      .select('endpoint, subscription')
      .eq('user_id', target.userId);

    if (error) throw error;
    if (!rows?.length) {
      return new Response(
        JSON.stringify({ sent: 0, reason: 'no_subscriptions' }),
        { headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }

    const messagePayload = JSON.stringify({
      title: target.title,
      body:  target.body,
      url:   target.url,
    });

    const results = await Promise.allSettled(
      rows.map((row) => webpush.sendNotification(row.subscription as webpush.PushSubscription, messagePayload)),
    );

    // Remove subscriptions the push service reports as expired (410 Gone)
    const expiredEndpoints: string[] = [];
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === 'rejected') {
        const err = r.reason as { statusCode?: number } | null;
        if (err?.statusCode === 410) expiredEndpoints.push(rows[i].endpoint as string);
      }
    }
    if (expiredEndpoints.length > 0) {
      await sb.from('push_subscriptions').delete().in('endpoint', expiredEndpoints);
    }

    const sent   = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return new Response(
      JSON.stringify({ sent, failed }),
      { headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  }
});
