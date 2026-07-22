import { AppPageShell } from '@/components/design-system/AppPageShell';

/** Non-home app routes (messages, profile, …) while lazy chunks load. */
export function AppShellGenericSkeleton() {
  return (
    <AppPageShell className="space-y-4 py-4" aria-busy="true" aria-label="Carregando página">
      <div className="h-8 w-40 animate-pulse rounded-xl bg-slate-100" />
      <div className="h-48 animate-pulse rounded-2xl bg-slate-100/90" />
      <div className="h-32 animate-pulse rounded-2xl bg-slate-100/80" />
    </AppPageShell>
  );
}
