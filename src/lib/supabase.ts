import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase.database';
import { authDevLog } from '@/lib/authDebug';

let browserClient: SupabaseClient<Database> | null = null;
let envLogged = false;

function trimStr(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/** Rejects template / example values so we do not silently build a broken client. */
function looksLikePlaceholderUrl(url: string): boolean {
  return /YOUR_PROJECT_REF|SEU_PROJETO|xxxx\.supabase|example\.com|placeholder|REPLACE_WITH/i.test(url);
}

function looksLikePlaceholderKey(key: string): boolean {
  if (key === 'your-anon-key' || key === 'placeholder') return true;
  return /REPLACE_WITH|SUA_PUBLISHABLE|YOUR_ANON|LINKHELP_REPLACE|PASTE_YOUR/i.test(key);
}

/**
 * Reads and normalizes Supabase env for the browser bundle.
 * Trims whitespace; validates URL; rejects obvious placeholders.
 */
export function readSupabaseBrowserEnv(): { url: string; anonKey: string } | null {
  const rawUrl = trimStr(import.meta.env.VITE_SUPABASE_URL);
  const rawKey = trimStr(import.meta.env.VITE_SUPABASE_ANON_KEY);

  if (!rawUrl || !rawKey) return null;
  if (looksLikePlaceholderUrl(rawUrl) || looksLikePlaceholderKey(rawKey)) return null;

  let url: string;
  try {
    const u = new URL(rawUrl);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    url = u.href.replace(/\/+$/, '');
  } catch {
    return null;
  }

  if (rawKey.length < 20) return null;

  return { url, anonKey: rawKey };
}

export function isSupabaseConfigured(): boolean {
  logEnvDiagnosisOnce();
  return readSupabaseBrowserEnv() !== null;
}

function logEnvDiagnosisOnce(): void {
  if (!import.meta.env.DEV || envLogged) return;
  envLogged = true;

  const rawUrl = trimStr(import.meta.env.VITE_SUPABASE_URL);
  const rawKey = trimStr(import.meta.env.VITE_SUPABASE_ANON_KEY);
  const resolved = readSupabaseBrowserEnv();

  let parseHost: string | null = null;
  try {
    parseHost = rawUrl ? new URL(rawUrl).host : null;
  } catch {
    parseHost = '(invalid URL)';
  }

  const payload = {
    resolved: Boolean(resolved),
    urlDefined: Boolean(rawUrl),
    keyDefined: Boolean(rawKey),
    urlLength: rawUrl.length,
    urlHost: parseHost,
    keyLength: rawKey.length,
    keyPrefix: rawKey ? `${rawKey.slice(0, 10)}…` : '(empty)',
    hint: resolved
      ? 'Env OK — if auth still fails, check Supabase Auth logs / Google provider / redirect URLs (localhost:3000 and /auth/callback per package.json).'
      : 'Create or edit `.env` (NOT .env.example) in the project root with real VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from Supabase → Settings → API. Restart dev server after saving.',
  };

  authDevLog('Supabase env (diagnostic)', payload);

  if (!resolved && import.meta.env.DEV) {
    console.error('[LinkHelp] Supabase env is missing, invalid, or still using placeholder values.', payload);
  }
}

/**
 * Singleton browser Supabase client with persisted session (localStorage).
 * Returns null when env vars are missing or invalid.
 */
export function getSupabase(): SupabaseClient<Database> | null {
  logEnvDiagnosisOnce();
  const env = readSupabaseBrowserEnv();
  if (!env) return null;
  if (browserClient) return browserClient;

  browserClient = createClient<Database>(env.url, env.anonKey, {
    auth: {
      /** PKCE + persisted browser session — required for Google OAuth on Vercel */
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      flowType: 'pkce',
    },
  });
  return browserClient;
}

/** Drop singleton so the next `getSupabase()` builds a fresh client (e.g. after sign-out). */
export function resetSupabaseBrowserClient(): void {
  browserClient = null;
}

/** Validates env + project reachability (auth health endpoint; no table RLS). */
export async function checkSupabaseConnection(): Promise<{ ok: boolean; error?: string }> {
  const env = readSupabaseBrowserEnv();
  if (!env) {
    return { ok: false, error: 'Missing or invalid VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY' };
  }
  try {
    const res = await fetch(`${env.url}/auth/v1/health`, {
      headers: { apikey: env.anonKey, Authorization: `Bearer ${env.anonKey}` },
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}
