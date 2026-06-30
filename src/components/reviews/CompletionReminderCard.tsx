import { AlertCircle } from 'lucide-react';
import { LhButton } from '@/components/design-system/LhButton';

type Props = {
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
  className?: string;
};

export function CompletionReminderCard({ title, body, actionLabel, onAction, className }: Props) {
  return (
    <div
      className={`mb-4 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4 sm:flex-row sm:items-center sm:justify-between ${className ?? ''}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
          <AlertCircle className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-black text-amber-950">{title}</p>
          <p className="mt-0.5 text-xs font-medium leading-relaxed text-amber-900/80">{body}</p>
        </div>
      </div>
      <LhButton variant="primary" onClick={onAction} className="shrink-0">
        {actionLabel}
      </LhButton>
    </div>
  );
}
