import * as Icons from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { HELPER_TRAINING_LESSONS } from '@/data/helperTrainingCatalog';

type Props = {
  lessonId: string | null;
  open: boolean;
  onClose: () => void;
  onMarkComplete: (lessonId: string) => void;
  alreadyComplete: boolean;
};

export function TrainingLessonDrawer({ lessonId, open, onClose, onMarkComplete, alreadyComplete }: Props) {
  const { t } = useLanguage();

  if (!open || !lessonId) return null;

  const meta = HELPER_TRAINING_LESSONS.find((l) => l.id === lessonId);
  const durationSec = meta?.durationSec ?? 60;
  const prefix = `training.lessons.${lessonId}`;

  const bullets = [1, 2, 3, 4].map((i) => t(`${prefix}.b${i}`));

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-[16/10] sm:aspect-[16/9] bg-gradient-to-br from-indigo-100 via-sky-50 to-violet-100 shrink-0">
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_30%_20%,white,transparent_55%)]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-white/80 backdrop-blur shadow-lg flex items-center justify-center text-indigo-600">
              <Icons.Play className="w-8 h-8 opacity-40" />
            </div>
          </div>
          <p className="absolute bottom-3 left-4 right-4 text-center text-[10px] font-semibold text-slate-600/90">
            {t('training.media_placeholder')}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-full bg-white/90 hover:bg-white shadow-sm text-slate-600"
            aria-label={t('common.close')}
          >
            <Icons.X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-6 space-y-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600 mb-1">{t('training.micro_lesson')}</p>
            <h2 className="text-xl font-black text-slate-900 leading-tight">{t(`${prefix}.title`)}</h2>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              {t('training.duration_line', { sec: durationSec })}
            </p>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed font-medium">{t(`${prefix}.hook`)}</p>
          <ul className="space-y-2.5">
            {bullets.map((line, idx) => (
              <li key={idx} className="flex gap-3 text-sm text-slate-700 leading-snug">
                <span className="shrink-0 w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center text-xs font-black border border-emerald-100">
                  {idx + 1}
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="shrink-0 p-4 border-t border-slate-100 bg-slate-50/80 flex flex-col gap-2">
          {alreadyComplete ? (
            <div className="flex items-center justify-center gap-2 py-3 text-emerald-700 font-bold text-sm">
              <Icons.CheckCircle2 className="w-5 h-5" /> {t('training.lesson_done')}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                onMarkComplete(lessonId);
                onClose();
              }}
              className="w-full min-h-[52px] rounded-2xl bg-slate-900 text-white font-black text-sm hover:bg-black transition-colors flex items-center justify-center gap-2 shadow-lg"
            >
              <Icons.Check className="w-5 h-5" strokeWidth={3} />
              {t('training.mark_complete')}
            </button>
          )}
          <button type="button" onClick={onClose} className="w-full py-2 text-sm font-bold text-slate-500 hover:text-slate-800">
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
