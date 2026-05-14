import { useSessionViewer } from '@/hooks/useSessionViewer';

/** @deprecated Prefer `useSessionViewer` — kept for legacy imports. */
export function useHelpers() {
  const me = useSessionViewer();
  return { helper: me, client: me };
}
