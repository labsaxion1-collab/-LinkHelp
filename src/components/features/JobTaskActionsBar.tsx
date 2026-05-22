import { useLanguage } from '@/context/LanguageContext';

type Props = {
  canCancel?: boolean;
  canRemove?: boolean;
  canRepublish?: boolean;
  canFinalize?: boolean;
  onCancel?: () => void;
  onRemove?: () => void;
  onRepublish?: () => void;
  onFinalize?: () => void;
};

export function JobTaskActionsBar({
  canCancel = true,
  canRemove = true,
  canRepublish = false,
  canFinalize = false,
  onCancel,
  onRemove,
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
      {canRemove && onRemove ? (
        <button type="button" onClick={onRemove} className={`${btn} border-slate-200 bg-white text-slate-600 hover:bg-slate-50`}>
          {t('job_actions.remove')}
        </button>
      ) : null}
    </div>
  );
}
