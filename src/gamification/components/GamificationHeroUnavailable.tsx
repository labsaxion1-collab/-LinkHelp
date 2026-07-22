import type { UserType } from '@/gamification/types/gamification';

type Props = {
  userType: UserType;
};

/** Neutral state when gamification cannot be loaded — no rank fallback. */
export function GamificationHeroUnavailable({ userType }: Props) {
  const label = userType === 'client' ? 'Cliente' : 'Helper';

  return (
    <section
      role="status"
      className="relative left-1/2 isolate mb-4 w-[100dvw] max-w-none -translate-x-1/2 overflow-hidden border border-white/10 bg-[#02040a] text-white lg:left-auto lg:w-full lg:translate-x-0 lg:rounded-[1.75rem]"
    >
      <div className="relative z-10 px-6 py-10 text-center sm:px-8 sm:py-12">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-white/45">{label}</p>
        <p className="mt-3 text-sm font-semibold text-white/75 sm:text-base">
          Não foi possível carregar seu nível agora.
        </p>
        <p className="mt-2 text-xs text-white/50">Atualize a página ou tente novamente em instantes.</p>
      </div>
    </section>
  );
}
