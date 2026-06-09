import { LhModal } from '@/components/design-system/LhModal';
import type { Job } from '@/types/job';

type Props = {
  open: boolean;
  job: Job | null;
  busy?: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
  t: (key: string) => string;
};

export function ServiceConfirmModal({ open, job, busy, onConfirm, onDismiss, t }: Props) {
  if (!open || !job) return null;

  return (
    <LhModal open={open} onClose={busy ? () => undefined : onDismiss} title={t('service_confirm.title')} size="md">
      <p className="text-sm font-medium leading-relaxed text-slate-600">{t('service_confirm.body')}</p>
      <p className="mt-2 text-sm font-bold text-slate-900">{job.title}</p>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          disabled={busy}
          onClick={onDismiss}
          className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {t('service_confirm.not_yet')}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onConfirm}
          className="min-h-[44px] rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {t('service_confirm.confirm')}
        </button>
      </div>
    </LhModal>
  );
}
