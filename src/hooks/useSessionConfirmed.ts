import { useAuth } from '@/context/AuthContext';

/**
 * True only after Supabase bootstrap finished AND a real session+profile exist.
 * Snapshot paint must never be treated as authorization.
 */
export function useSessionConfirmed(): boolean {
  const { sessionConfirmed } = useAuth();
  return sessionConfirmed;
}

/** Private mutations / navigation that mutate server state. */
export function usePrivateActionsEnabled(): boolean {
  return useSessionConfirmed();
}
