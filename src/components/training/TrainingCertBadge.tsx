import { clsx } from 'clsx';
import { Award } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import type { TrainingCertLevel } from '@/utils/helperTrainingProgress';

const styles: Record<Exclude<TrainingCertLevel, 'none'>, string> = {
  basic: 'bg-slate-100 text-slate-700 border-slate-200/90',
  pro: 'bg-purple-50 text-purple-800 border-purple-200/90',
  elite: 'bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-950 border-amber-200/90 ring-1 ring-amber-200/60',
};

export function TrainingCertBadge({
  level,
  size = 'sm',
  className,
}: {
  level: TrainingCertLevel;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const { t } = useLanguage();
  if (level === 'none') return null;

  const sz = size === 'sm' ? 'text-[9px] px-1.5 py-0.5 gap-0.5' : 'text-[10px] px-2 py-1 gap-1';

  return (
    <span
      className={clsx(
        'inline-flex items-center font-black uppercase tracking-wide rounded-md border shadow-sm',
        styles[level],
        sz,
        className,
      )}
    >
      <Award className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3 shrink-0 opacity-90'} strokeWidth={2.5} />
      {t(`training.cert_${level}`)}
    </span>
  );
}
