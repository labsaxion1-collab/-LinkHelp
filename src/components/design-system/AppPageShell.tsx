import type { ReactNode } from 'react';
import { clsx } from 'clsx';
import { premium } from './premiumClasses';

type Props = {
  children: ReactNode;
  className?: string;
  wide?: boolean;
};

/** Standard page wrapper for authenticated app areas. */
export function AppPageShell({ children, className, wide }: Props) {
  return (
    <div className={clsx(premium.appPage, 'w-full min-w-0', wide ? 'max-w-none' : 'mx-auto max-w-6xl', className)}>
      {children}
    </div>
  );
}
