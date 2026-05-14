import type { HTMLAttributes } from 'react';
import { clsx } from 'clsx';

type Padding = 'none' | 'md' | 'lg';

type Props = HTMLAttributes<HTMLDivElement> & {
  /** Elevated surface with card shadow */
  elevated?: boolean;
  padding?: Padding;
};

const pad: Record<Padding, string> = {
  none: '',
  md: 'p-4',
  lg: 'p-4 sm:p-5',
};

/**
 * Standard surface for LinkHelp cards (feed, radar, hub, sidebar inner panels).
 */
export function LhCard({ className, elevated = true, padding = 'lg', ...rest }: Props) {
  return (
    <div
      className={clsx(
        'rounded-[var(--lh-radius-lg)] border border-slate-200/80 bg-white',
        elevated && 'shadow-[var(--lh-shadow-card)]',
        pad[padding],
        className,
      )}
      {...rest}
    />
  );
}
