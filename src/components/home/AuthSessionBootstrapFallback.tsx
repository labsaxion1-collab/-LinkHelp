/** Minimal placeholder while Supabase session is still unknown — no central spinner. */
export function AuthSessionBootstrapFallback() {
  return (
    <div
      className="flex w-full flex-1 flex-col px-4 pb-8 pt-4 sm:px-6 md:px-8"
      aria-busy="true"
      aria-label="Verificando sessão"
    >
      <div className="h-3 w-32 max-w-[40%] animate-pulse rounded-full bg-slate-200/90" />
      <div className="mt-6 h-40 animate-pulse rounded-[1.75rem] bg-slate-100/90 sm:h-48" />
      <div className="mt-4 h-24 animate-pulse rounded-2xl bg-slate-100/80" />
    </div>
  );
}
