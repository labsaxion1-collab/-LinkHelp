import type { ReactNode } from 'react';
import { clsx } from 'clsx';

type Props = {
  title: string;
  action?: ReactNode;
  className?: string;
};

export function ProfileSectionHeader({ title, action, className }: Props) {
  return (
    <div className={clsx('mb-3 flex items-center justify-between gap-3', className)}>
      <h2 className="text-[11px] font-black uppercase tracking-[0.16em] text-[#2563FF]">
        {title}
      </h2>
      {action}
    </div>
  );
}
