import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { assertServerDataIsolation } from './environmentIsolation.js';

export function createSupabaseServiceRoleClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error('SUPABASE_SERVER_NOT_CONFIGURED');
  const isolation = assertServerDataIsolation();
  if (!isolation.ok) throw new Error('ENVIRONMENT_MISCONFIGURED');
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export function createSupabaseAuthVerifier(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error('SUPABASE_SERVER_NOT_CONFIGURED');
  const isolation = assertServerDataIsolation();
  if (!isolation.ok) throw new Error('ENVIRONMENT_MISCONFIGURED');
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
