/**
 * Web Push sender — VAPID via npm:web-push
 *
 * Auth (required before send):
 *   • Database Webhook payload → Bearer service_role only
 *   • Direct payload { userId, title, ... } → valid user JWT and userId === auth user
 *     (PushTestPage sends to self); service_role may target any user for internal calls
 *
 * Payload formats:
 *   1. Direct: POST { userId, title, body?, url? }
 *   2. Webhook: POST { type: "INSERT", table: "push_notification_queue", record: { ... } }
 *
 * Secrets: VAPID_* , SUPABASE_URL , SUPABASE_SERVICE_ROLE_KEY
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
      title: r.title,
      body: r.body ?? '',
      url: r.url ?? '/',
    };
  }
  if (!payload.userId || !payload.title) return null;
  return {
    userId: payload.userId,
    title: payload.title,
    body: payload.body ?? '',
    url: payload.url ?? '/',
  };
}

function bearerToken(req: Request): string | null {
  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7).trim();
  return token.length > 0 ? token : null;
}

/** Constant-time string compare — mitigates timing leaks on bearer tokens. */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function isServiceRoleAuth(req: Request): boolean {
  const token = bearerToken(req);
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!token || !serviceKey) return false;
  return constantTimeEqual(token, serviceKey);
}

async function getAuthedUserId(req: Request): Promise<string | null> {
  const token = bearerToken(req);
  if (!token) return null;

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (serviceKey && constantTimeEqual(token, serviceKey)) return null;

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  if (!supabaseUrl || !serviceKey) return null;

  const sb = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error,
  } = await sb.auth.getUser(token);

  if (error || !user) return null;
  return user.id;
}

async function authorizeSend(
  req: Request,
  rawPayload: IncomingPayload,
  targetUserId: string,
): Promise<Response | null> {
  if (isWebhookPayload(rawPayload)) {
    if (!isServiceRoleAuth(req)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    return null;
  }

  if (isServiceRoleAuth(req)) {
    return null;
  }

  const callerId = await getAuthedUserId(req);
  if (!callerId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  if (callerId !== targetUserId) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  return null;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  try {
    const privateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const subject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:support@linkhelp.ca';

    if (!privateKey || !publicKey) {
      return new Response(JSON.stringify({ error: 'VAPID keys not configured' }), {
        status: 501,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);

    const rawPayload = (await req.json()) as IncomingPayload;
    const target = extractTarget(rawPayload);

    if (!target) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId/user_id and title' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }

    const authError = await authorizeSend(req, rawPayload, target.userId);
    if (authError) return authError;

    const sb = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: rows, error } = await sb
      .from('push_subscriptions')
      .select('endpoint, subscription')
      .eq('user_id', target.userId);

    if (error) throw error;
    if (!rows?.length) {
      return new Response(JSON.stringify({ sent: 0, reason: 'no_subscriptions' }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const messagePayload = JSON.stringify({
      title: target.title,
      body: target.body,
      url: target.url,
    });

    const results = await Promise.allSettled(
      rows.map((row) => webpush.sendNotification(row.subscription as webpush.PushSubscription, messagePayload)),
    );

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

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return new Response(JSON.stringify({ sent, failed }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
