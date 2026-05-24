import type { ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { premium } from './premiumClasses';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'legacy-primary' | 'legacy-secondary';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  block?: boolean;
};

const legacyBase =
  'inline-flex items-center justify-center gap-2 font-semibold text-sm rounded-[var(--lh-radius-md)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none min-h-[44px] px-4 py-2.5';

const legacyVariants: Record<string, string> = {
  'legacy-primary': 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm',
  'legacy-secondary': 'bg-white text-slate-900 border border-slate-200 hover:bg-slate-50',
};

export function LhButton({ className, variant = 'primary', block, ...rest }: Props) {
  if (variant === 'primary') {
    return <button type="button" className={clsx(premium.btnPrimary, block && 'w-full', className)} {...rest} />;
  }
  if (variant === 'secondary') {
    return <button type="button" className={clsx(premium.btnSecondary, block && 'w-full', className)} {...rest} />;
  }
  if (variant === 'ghost') {
    return (
      <button
        type="button"
        className={clsx(
          'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-[#F2F4F7]/80 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-50',
          block && 'w-full',
          className,
        )}
        {...rest}
      />
    );
  }
  if (variant === 'danger') {
    return (
      <button
        type="button"
        className={clsx(
          'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-red-400/30 bg-red-500/15 px-4 py-2.5 text-sm font-bold text-red-200 hover:bg-red-500/25 disabled:opacity-50',
          block && 'w-full',
          className,
        )}
        {...rest}
      />
    );
  }
  const mapped = variant.startsWith('legacy') ? variant : 'legacy-primary';
  return (
    <button
      type="button"
      className={clsx(legacyBase, legacyVariants[mapped], block && 'w-full', className)}
      {...rest}
    />
  );
}
