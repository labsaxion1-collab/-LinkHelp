import { PremiumResponsiveModal } from '@/components/design-system/PremiumResponsiveModal';
import { useLanguage } from '@/context/LanguageContext';
import * as Icons from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  confirming?: boolean;
};

export function CancelRequestModal({ open, onClose, onConfirm, confirming }: Props) {
  const { t } = useLanguage();

  return (
    <PremiumResponsiveModal
      open={open}
      onClose={onClose}
      variant="danger"
      title={t('job_actions.cancel_modal_title')}
      footer={
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirming}
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl border border-amber-300 bg-amber-500 px-4 text-sm font-black text-white shadow-lg shadow-amber-500/20 hover:bg-amber-600 disabled:opacity-60"
          >
            {confirming ? t('common.loading') : t('job_actions.cancel_modal_confirm')}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={confirming}
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {t('job_actions.cancel_modal_back')}
          </button>
        </div>
      }
    >
      <p className="text-sm leading-relaxed text-slate-600">{t('job_actions.cancel_modal_body')}</p>
      <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-amber-100 bg-amber-50/80 px-3.5 py-3">
        <Icons.AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
        <p className="text-xs font-semibold leading-relaxed text-amber-900">
          {t('job_actions.cancel_modal_warning')}
        </p>
      </div>
    </PremiumResponsiveModal>
  );
}
