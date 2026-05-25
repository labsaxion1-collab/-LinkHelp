import type { ReactNode } from 'react';
import { clsx } from 'clsx';
import { premium } from './premiumClasses';

type Props = {
  children: ReactNode;
  className?: string;
  wide?: boolean;
};

/** Standard page wrapper for authenticated app areas (premium dark). */
export function AppPageShell({ children, className, wide }: Props) {
  return (
    <div className={clsx(premium.appPage, '-mt-2 sm:-mt-4 w-full max-w-full min-w-0', wide ? 'mx-auto max-w-[1600px]' : 'mx-auto max-w-6xl', className)}>
      {children}
    </div>
  );
}
