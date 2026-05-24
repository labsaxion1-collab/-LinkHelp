import type { ReactNode } from 'react';
import { clsx } from 'clsx';
import { premium } from './premiumClasses';

type Props = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
};

export function LhSectionTitle({ title, subtitle, action, className }: Props) {
  return (
    <div className={clsx('mb-4 flex flex-wrap items-end justify-between gap-3', className)}>
      <div>
        <h2 className={premium.sectionTitle}>{title}</h2>
        {subtitle ? <p className={premium.sectionSubtitle}>{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}
