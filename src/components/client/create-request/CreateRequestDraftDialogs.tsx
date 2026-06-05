import { PremiumResponsiveModal } from '@/components/design-system/PremiumResponsiveModal';

type DialogProps = {
  t: (key: string) => string;
  onContinue: () => void;
  onDiscard: () => void;
};

export function CreateRequestResumeDraftDialog({ t, onContinue, onDiscard }: DialogProps) {
  return (
    <PremiumResponsiveModal
      open
      onClose={onDiscard}
      title={t('create_modal.draft_resume_title')}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onDiscard}
            className="rounded-xl border-2 border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            {t('create_modal.draft_resume_discard')}
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="rounded-xl bg-[#1565FF] px-5 py-3 text-sm font-bold text-white hover:bg-[#0F55D9]"
          >
            {t('create_modal.draft_resume_continue')}
          </button>
        </div>
      }
    >
      <p className="text-sm font-medium leading-relaxed text-slate-600">{t('create_modal.draft_resume_message')}</p>
    </PremiumResponsiveModal>
  );
}

export function CreateRequestSaveDraftDialog({ t, onSave, onDiscard }: DialogProps & { onSave: () => void }) {
  return (
    <PremiumResponsiveModal
      open
      onClose={onDiscard}
      title={t('create_modal.draft_close_title')}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onDiscard}
            className="rounded-xl border-2 border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            {t('create_modal.draft_close_discard')}
          </button>
          <button
            type="button"
            onClick={onSave}
            className="rounded-xl bg-[#1565FF] px-5 py-3 text-sm font-bold text-white hover:bg-[#0F55D9]"
          >
            {t('create_modal.draft_close_save')}
          </button>
        </div>
      }
    >
      <p className="text-sm font-medium leading-relaxed text-slate-600">{t('create_modal.draft_close_message')}</p>
    </PremiumResponsiveModal>
  );
}
