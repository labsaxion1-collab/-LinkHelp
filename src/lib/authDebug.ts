/** DEV-only structured logs for Supabase Auth / profile flows. Never call with secrets. */
export function authDevLog(phase: string, data: Record<string, unknown>): void {
  if (!import.meta.env.DEV) return;
  console.groupCollapsed(`[LinkHelp Auth] ${phase}`);
  console.log(data);
  console.groupEnd();
}
