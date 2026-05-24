import type { ReactNode } from 'react';
import { clsx } from 'clsx';
import { premium } from './premiumClasses';

type Props = {
  children: ReactNode;
  className?: string;
  tone?: 'default' | 'success' | 'warning';
};

const tones = {
  default: '',
  success: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
  warning: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
};

export function LhBadge({ children, className, tone = 'default' }: Props) {
  return <span className={clsx(premium.badge, tones[tone], className)}>{children}</span>;
}
