import type { UserType } from '@/gamification/types/gamification';

type Props = {
  userType: UserType;
};

/** Placeholder while gamification heroKey is loading — preserves hero footprint, no rank text. */
export function GamificationHeroSkeleton({ userType }: Props) {
  const accent = userType === 'client' ? 'from-blue-500/20' : 'from-lime-500/20';

  return (
    <section
      aria-busy="true"
      aria-label="Carregando nível"
      className="relative left-1/2 isolate mb-4 w-[100dvw] max-w-none -translate-x-1/2 overflow-hidden border-0 bg-[#02040a] text-white shadow-none ring-1 ring-white/5 lg:left-auto lg:w-full lg:translate-x-0 lg:rounded-[1.75rem]"
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${accent} to-transparent opacity-40`} />
      <div className="relative z-10 animate-pulse px-3 pb-6 pt-3 sm:px-8 sm:pb-8 sm:pt-5">
        <div className="flex items-center justify-between gap-3">
          <div className="h-4 w-28 rounded-full bg-white/10 sm:w-36" />
          <div className="h-10 w-24 rounded-full bg-white/10 sm:w-40" />
        </div>
        <div className="mx-auto mt-6 h-8 max-w-[18rem] rounded-xl bg-white/10 sm:mt-8 sm:h-10" />
        <div className="mx-auto mt-8 grid max-w-[41rem] grid-cols-2 gap-3 sm:mt-10 sm:gap-6">
          <div className="aspect-square max-h-[11rem] rounded-2xl bg-white/10 sm:max-h-[14rem]" />
          <div className="space-y-2 self-center">
            <div className="h-3 w-full rounded bg-white/10" />
            <div className="h-3 w-[92%] rounded bg-white/10" />
            <div className="h-3 w-[78%] rounded bg-white/10" />
          </div>
        </div>
        <div className="mx-auto mt-6 h-9 w-40 rounded-full bg-white/10 sm:mt-8" />
        <div className="mx-auto mt-4 h-[5.75rem] max-w-[45rem] rounded-2xl bg-white/[0.07]" />
      </div>
    </section>
  );
}
