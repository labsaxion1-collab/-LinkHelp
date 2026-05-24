import type { HTMLAttributes } from 'react';
import { clsx } from 'clsx';

type Padding = 'none' | 'md' | 'lg';
type Variant = 'premium' | 'legacy';

type Props = HTMLAttributes<HTMLDivElement> & {
  elevated?: boolean;
  padding?: Padding;
  variant?: Variant;
};

const pad: Record<Padding, string> = {
  none: '',
  md: 'p-4',
  lg: 'p-4 sm:p-5',
};

/** Standard surface for LinkHelp cards (premium glass by default). */
export function LhCard({ className, elevated = true, padding = 'lg', variant = 'premium', ...rest }: Props) {
  return (
    <div
      className={clsx(
        variant === 'premium'
          ? clsx('lh-glass-card-solid', elevated && 'shadow-[var(--lh-shadow-premium)]')
          : clsx('rounded-[var(--lh-radius-lg)] border border-slate-200/80 bg-white', elevated && 'shadow-[var(--lh-shadow-card)]'),
        pad[padding],
        className,
      )}
      {...rest}
    />
  );
}
