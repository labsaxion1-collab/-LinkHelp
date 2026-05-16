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
