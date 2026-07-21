import type { Session } from '@supabase/supabase-js';
import { isFluxAdminAppMetadata } from '@/backoffice/permissions/roles';
import { isAdminRoute } from '@/utils/fluxHost';

/** FLUX admin gate — JWT app_metadata (legacy + super_admin until full RBAC). */
export function isFluxAdmin(session: Session | null | undefined): boolean {
  if (!session?.user) return false;
  const role = session.user.app_metadata?.role;
  return isFluxAdminAppMetadata(role);
}

export function isFluxAdminAppMetadataRole(role: unknown): boolean {
  return isFluxAdminAppMetadata(role);
}

/** @deprecated Prefer `isAdminRoute` from `@/utils/fluxHost`. */
export function isAdminPath(pathname: string): boolean {
  return isAdminRoute(pathname);
}

export { isAdminRoute };
