/**
 * Web Push sender — deploy with secrets:
 *   VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY (must match VITE_VAPID_PUBLIC_KEY)
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * POST { userId, title, body, url? }
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const privateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    if (!privateKey || !publicKey) {
      return new Response(JSON.stringify({ error: 'VAPID keys not configured' }), {
        status: 501,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const { userId, title, body, url } = await req.json();
    if (!userId || !title) {
      return new Response(JSON.stringify({ error: 'userId and title required' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const sb = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: rows, error } = await sb
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userId);

    if (error) throw error;
    if (!rows?.length) {
      return new Response(JSON.stringify({ sent: 0, reason: 'no_subscriptions' }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // web-push is not bundled here — wire npm:web-push or call an external sender in production.
    console.log('[send-push] would send', { userId, title, body, url, count: rows.length });

    return new Response(JSON.stringify({ sent: 0, stub: true, subscriptions: rows.length }), {
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
