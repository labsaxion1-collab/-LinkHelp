import { useLanguage } from '@/context/LanguageContext';

type Props = {
  canCancel?: boolean;
  canRepublish?: boolean;
  canFinalize?: boolean;
  onCancel?: () => void;
  onRepublish?: () => void;
  onFinalize?: () => void;
};

export function JobTaskActionsBar({
  canCancel = true,
  canRepublish = false,
  canFinalize = false,
  onCancel,
  onRepublish,
  onFinalize,
}: Props) {
  const { t } = useLanguage();
  const btn =
    'rounded-lg px-3 py-1.5 text-xs font-bold border transition-colors min-h-[36px]';

  return (
    <div className="flex flex-wrap gap-2">
      {canFinalize && onFinalize ? (
        <button type="button" onClick={onFinalize} className={`${btn} border-emerald-300 bg-emerald-600 text-white hover:bg-emerald-700`}>
          {t('job_actions.finalize')}
        </button>
      ) : null}
      {canCancel && onCancel ? (
        <button type="button" onClick={onCancel} className={`${btn} border-amber-200 bg-white text-amber-800 hover:bg-amber-50`}>
          {t('job_actions.cancel')}
        </button>
      ) : null}
      {canRepublish && onRepublish ? (
        <button type="button" onClick={onRepublish} className={`${btn} border-blue-200 bg-white text-blue-700 hover:bg-blue-50`}>
          {t('job_actions.republish')}
        </button>
      ) : null}
    </div>
  );
}
