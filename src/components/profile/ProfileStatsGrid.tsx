import type { ElementType } from 'react';
import { CalendarX2, CheckCircle2, FileText, Star, UserCheck } from 'lucide-react';
import { clsx } from 'clsx';

export type ProfileStatItem = {
  key: string;
  label: string;
  value: string;
  icon: ElementType;
  iconColor: string;
  iconBg: string;
};

type Props = {
  title?: string;
  items: ProfileStatItem[];
};

export function ProfileStatsGrid({ items }: Props) {
  if (!items.length) return null;

  return (
    <section>
      <div className="grid grid-cols-4 gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.key}
              className="flex min-h-[96px] flex-col items-center justify-center gap-1.5 rounded-[1.15rem] border border-slate-200/90 bg-white px-1.5 py-3 text-center shadow-[0_8px_20px_rgba(15,23,42,0.04)]"
            >
              <span
                className={clsx(
                  'flex h-8 w-8 items-center justify-center rounded-xl',
                  item.iconBg,
                  item.iconColor,
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <p className="text-lg font-black tabular-nums leading-none text-slate-950">
                {item.value}
              </p>
              <p className="line-clamp-2 text-[9px] font-bold uppercase leading-tight tracking-wide text-slate-500">
                {item.label}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export const PROFILE_STAT_ICONS = {
  published: FileText,
  completed: CheckCircle2,
  rating: Star,
  cancelled: CalendarX2,
  accepted: UserCheck,
} as const;
