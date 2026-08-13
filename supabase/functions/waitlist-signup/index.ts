import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { validateWaitlistInput, type ValidWaitlistInput, type WaitlistInput } from './validation.ts';

const JSON_HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const DEFAULT_ORIGINS = [
  'https://linkhelp.app',
  'https://www.linkhelp.app',
  'https://app.linkhelp.app',
  'https://teste.linkhelp.app',
  'http://localhost:3000',
];

function allowedOrigins(): Set<string> {
  const configured = (Deno.env.get('WAITLIST_ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return new Set([...DEFAULT_ORIGINS, ...configured]);
}

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  return {
    'Access-Control-Allow-Origin': allowedOrigins().has(origin) ? origin : DEFAULT_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

function json(req: Request, body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...corsHeaders(req) },
  });
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function clientAddress(req: Request): string {
  return (req.headers.get('cf-connecting-ip')
    ?? req.headers.get('x-forwarded-for')?.split(',')[0]
    ?? 'unknown').trim();
}

function updateFields(value: ValidWaitlistInput, consentAt: string | null) {
  return {
    first_name: value.first_name,
    city: value.city,
    interest_type: value.interest_type,
    marketing_consent: value.marketing_consent,
    marketing_consent_at: consentAt,
    source: value.source,
    locale: value.locale,
    ...(value.utm_source ? { utm_source: value.utm_source } : {}),
    ...(value.utm_medium ? { utm_medium: value.utm_medium } : {}),
    ...(value.utm_campaign ? { utm_campaign: value.utm_campaign } : {}),
    ...(value.utm_content ? { utm_content: value.utm_content } : {}),
    ...(value.utm_term ? { utm_term: value.utm_term } : {}),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return json(req, { code: 'METHOD_NOT_ALLOWED' }, 405);

  const origin = req.headers.get('origin');
  if (origin && !allowedOrigins().has(origin)) return json(req, { code: 'ORIGIN_NOT_ALLOWED' }, 403);

  const length = Number(req.headers.get('content-length') ?? 0);
  if (length > 12_000) return json(req, { code: 'INVALID_INPUT' }, 413);

  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!url || !serviceKey) return json(req, { code: 'SERVICE_UNAVAILABLE' }, 503);

  try {
    const payload = await req.json() as WaitlistInput;
    const validation = validateWaitlistInput(payload);

    // Honeypot responses are deliberately indistinguishable from success.
    if (!validation.ok && validation.code === 'BOT_DETECTED') {
      return json(req, { status: 'created' });
    }
    if (!validation.ok) return json(req, { code: 'INVALID_INPUT' }, 400);

    const supabase = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const salt = Deno.env.get('WAITLIST_RATE_LIMIT_SALT') ?? serviceKey.slice(-32);
    const rateKey = await sha256(`${salt}:${clientAddress(req)}`);
    const { data: allowed, error: rateError } = await supabase.rpc('check_waitlist_rate_limit', {
      p_key: rateKey,
      p_limit: 8,
      p_window_seconds: 900,
    });
    if (rateError || allowed !== true) return json(req, { code: 'RATE_LIMITED' }, 429);

    const value = validation.value;
    const consentAt = value.marketing_consent ? new Date().toISOString() : null;
    const { data: existing, error: lookupError } = await supabase
      .from('waitlist_leads')
      .select('id')
      .eq('email', value.email)
      .maybeSingle();
    if (lookupError) throw lookupError;

    if (existing) {
      const { error } = await supabase
        .from('waitlist_leads')
        .update(updateFields(value, consentAt))
        .eq('id', existing.id);
      if (error) throw error;
      return json(req, { status: 'already_registered' });
    }

    const { error: insertError } = await supabase.from('waitlist_leads').insert({
      email: value.email,
      ...updateFields(value, consentAt),
    });

    // A concurrent identical request may win the unique constraint race.
    if (insertError?.code === '23505') {
      const { error } = await supabase
        .from('waitlist_leads')
        .update(updateFields(value, consentAt))
        .eq('email', value.email);
      if (error) throw error;
      return json(req, { status: 'already_registered' });
    }
    if (insertError) throw insertError;

    return json(req, { status: 'created' }, 201);
  } catch (error) {
    console.error('waitlist-signup failed', error instanceof Error ? error.message : 'unknown');
    return json(req, { code: 'INTERNAL_ERROR' }, 500);
  }
});
