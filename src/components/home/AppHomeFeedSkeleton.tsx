import type { UserType } from '@/gamification/types/gamification';

type Props = {
  userType: UserType;
};

/** Reserved footprint for authenticated home feed while async blocks load. */
export function AppHomeFeedSkeleton({ userType }: Props) {
  const tint = userType === 'client' ? 'bg-blue-100/80' : 'bg-lime-100/80';

  return (
    <div aria-busy="true" aria-label="Carregando início" className="space-y-4 px-4 pb-8 pt-2 sm:px-6 md:px-8">
      <div className="grid grid-cols-2 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-28 animate-pulse rounded-2xl ${tint}`} />
        ))}
      </div>
      <div className="h-36 animate-pulse rounded-2xl bg-slate-100" />
      <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />
    </div>
  );
}
