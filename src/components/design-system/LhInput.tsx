import type { InputHTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { premium } from './premiumClasses';

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export function LhInput({ className, label, id, ...rest }: Props) {
  const input = <input id={id} className={clsx(premium.input, className)} {...rest} />;
  if (!label) return input;
  return (
    <label htmlFor={id} className="block text-sm font-semibold text-[#F2F4F7]/90">
      {label}
      <span className="mt-1 block">{input}</span>
    </label>
  );
}
