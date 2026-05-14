import type { ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  block?: boolean;
};

const base =
  'inline-flex items-center justify-center gap-2 font-semibold text-sm rounded-[var(--lh-radius-md)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none min-h-[44px] px-4 py-2.5';

const variants: Record<Variant, string> = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm',
  secondary: 'bg-white text-slate-900 border border-slate-200 hover:bg-slate-50',
  ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 border border-transparent',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
};

export function LhButton({ className, variant = 'primary', block, ...rest }: Props) {
  return <button type="button" className={clsx(base, variants[variant], block && 'w-full', className)} {...rest} />;
}
