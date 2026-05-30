import { LhModal } from '@/components/design-system/LhModal';
import { useLanguage } from '@/context/LanguageContext';

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  confirming?: boolean;
};

export function CancelRequestModal({ open, onClose, onConfirm, confirming }: Props) {
  const { t } = useLanguage();

  return (
    <LhModal
      open={open}
      onClose={onClose}
      title={t('job_actions.cancel_modal_title')}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={confirming}
            className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {t('job_actions.cancel_modal_back')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirming}
            className="min-h-[44px] rounded-xl border border-amber-300 bg-amber-500 px-5 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-60"
          >
            {confirming ? t('common.loading') : t('job_actions.cancel_modal_confirm')}
          </button>
        </div>
      }
    >
      <p className="text-sm leading-relaxed text-slate-600">{t('job_actions.cancel_modal_body')}</p>
    </LhModal>
  );
}
