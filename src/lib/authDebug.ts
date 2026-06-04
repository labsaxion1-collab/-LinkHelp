import type { User } from '@supabase/supabase-js';

/** DEV-only structured logs for Supabase Auth / profile flows. Never call with secrets. */
export function authDevLog(phase: string, data: Record<string, unknown>): void {
  if (!import.meta.env.DEV) return;
  console.groupCollapsed(`[LinkHelp Auth] ${phase}`);
  console.log(data);
  console.groupEnd();
}

/**
 * OAuth / bootstrap milestones — allowed in production (no tokens, no keys).
 * Use for debugging Google callback + session on Vercel.
 */
export function authFlowLog(message: string, data?: Record<string, unknown>): void {
  if (data && Object.keys(data).length > 0) {
    console.log(`[LinkHelp Auth] ${message}`, data);
  } else {
    console.log(`[LinkHelp Auth] ${message}`);
  }
}

/** `user_metadata.user_type` — may differ from `profiles.role`. */
export function roleFromAuthMetadata(user?: User | null): string | null {
  const raw = user?.user_metadata?.user_type;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

export type RoleRoutingLogPayload = {
  userId?: string | null;
  email?: string | null;
  role_from_profile?: unknown;
  role_from_auth?: string | null;
  redirect_destination?: string | null;
  [key: string]: unknown;
};

/** Temporary role-routing investigation — safe for production (no tokens). */
export function roleRoutingLog(where: string, payload: RoleRoutingLogPayload): void {
  console.log(`[LinkHelp RoleRouting] ${where}`, payload);
}
