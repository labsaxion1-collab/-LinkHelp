import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const cronSecret = Deno.env.get("CRON_SECRET");
  const headerSecret = req.headers.get("x-cron-secret");
  const authHeader = req.headers.get("Authorization") ?? "";

  const isServiceRole = authHeader.includes(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "__none__");
  const isCron = cronSecret && headerSecret === cronSecret;

  if (!isServiceRole && !isCron) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Missing Supabase env" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const sb = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await sb.rpc("process_expired_unlock_refunds");

  if (error) {
    console.error("[process-credit-refunds] unlock refunds", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: pausedData, error: pausedError } = await sb.rpc("process_expired_paused_requests");

  if (pausedError) {
    const missingPausedRpc =
      pausedError.code === "PGRST202" ||
      (pausedError.message ?? "").includes("process_expired_paused_requests");
    if (missingPausedRpc) {
      console.warn("[process-credit-refunds] paused expiry RPC not deployed yet", pausedError.message);
    } else {
      console.error("[process-credit-refunds] paused expiry", pausedError);
    }
  } else {
    console.log("[process-credit-refunds] paused expiry", pausedData);
  }

  console.log("[process-credit-refunds] unlock refunds", data);

  return new Response(
    JSON.stringify({
      ok: true,
      unlockRefunds: data,
      pausedExpiry: pausedError ? { skipped: true, error: pausedError.message } : pausedData,
    }),
    {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
