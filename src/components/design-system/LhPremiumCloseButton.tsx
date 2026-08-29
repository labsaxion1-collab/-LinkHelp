import type { Ref } from 'react';
import { clsx } from 'clsx';
import { X } from 'lucide-react';

/** Exact HelperApplyConfirmModal close control (normal + VIP). */
export const LH_PREMIUM_CLOSE_BUTTON_CLASS =
  'absolute right-2.5 top-2.5 inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50';

type Props = {
  onClick: () => void;
  label: string;
  disabled?: boolean;
  testId?: string;
  buttonRef?: Ref<HTMLButtonElement>;
  className?: string;
};

export function LhPremiumCloseButton({ onClick, label, disabled, testId, buttonRef, className }: Props) {
  return (
    <button
      ref={buttonRef}
      type="button"
      data-testid={testId}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={clsx(LH_PREMIUM_CLOSE_BUTTON_CLASS, className)}
    >
      <X className="h-4 w-4" aria-hidden />
    </button>
  );
}
