import type { Session } from '@supabase/supabase-js';

/** FLUX admin gate — Supabase app_metadata.role === 'admin'. */
export function isFluxAdmin(session: Session | null | undefined): boolean {
  if (!session?.user) return false;
  const role = session.user.app_metadata?.role;
  return role === 'admin' || role === 'flux_admin';
}

export function isAdminPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}
