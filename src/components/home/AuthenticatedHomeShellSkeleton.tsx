import { AppPageShell } from '@/components/design-system/AppPageShell';
import { AppHomeFeedSkeleton } from '@/components/home/AppHomeFeedSkeleton';
import { GamificationHeroSkeleton } from '@/gamification/components/GamificationHeroSkeleton';
import type { UserType } from '@/gamification/types/gamification';

export type AuthenticatedHomeShellVariant = UserType | 'neutral';

type Props = {
  variant: AuthenticatedHomeShellVariant;
};

function resolveHeroUserType(variant: AuthenticatedHomeShellVariant): UserType {
  return variant === 'helper' ? 'helper' : 'client';
}

function ProgressStripSkeleton({ variant }: { variant: AuthenticatedHomeShellVariant }) {
  const track =
    variant === 'helper' ? 'bg-lime-100/70' : variant === 'client' ? 'bg-blue-100/70' : 'bg-slate-100/80';

  return (
    <div aria-hidden className={`mx-4 mt-2 h-[5.75rem] animate-pulse rounded-2xl sm:mx-6 md:mx-8 ${track}`} />
  );
}

function QuickStripSkeleton({ variant }: { variant: AuthenticatedHomeShellVariant }) {
  if (variant === 'helper') {
    return (
      <div className="mx-4 grid grid-cols-3 gap-2 sm:mx-6 md:mx-8">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-lime-100/70" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-4 grid grid-cols-2 gap-2 sm:mx-6 md:mx-8 min-[480px]:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-16 animate-pulse rounded-2xl bg-blue-100/70" />
      ))}
    </div>
  );
}

/**
 * Structural placeholder for authenticated Home while dashboard chunk or profile bootstrap loads.
 */
export function AuthenticatedHomeShellSkeleton({ variant }: Props) {
  const heroType = resolveHeroUserType(variant);
  const feedType: UserType = variant === 'helper' ? 'helper' : 'client';

  return (
    <div className="relative w-full min-w-0 flex-1" aria-busy="true" aria-label="Carregando início">
      <GamificationHeroSkeleton userType={heroType} />
      <AppPageShell wide className="relative z-10 min-w-0 space-y-4 pb-8 pt-2">
        <ProgressStripSkeleton variant={variant} />
        <QuickStripSkeleton variant={variant} />
        <AppHomeFeedSkeleton userType={feedType} />
      </AppPageShell>
    </div>
  );
}
