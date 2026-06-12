import { clsx } from 'clsx';
import { useLanguage } from '@/context/LanguageContext';

type Props = {
  compact?: boolean;
  showTagline?: boolean;
  className?: string;
};

/** FLUX wordmark for admin console — dark premium styling. */
export function FluxBrandMark({ compact = false, showTagline = true, className }: Props) {
  const { t } = useLanguage();

  return (
    <div className={clsx('flex min-w-0 items-center', className)}>
      <div className="min-w-0">
        <p
          className={clsx(
            'font-black tracking-[0.24em] text-white',
            compact ? 'text-xs' : 'text-sm',
          )}
        >
          FLUX
        </p>
        {showTagline ? (
          <p className="truncate text-[9px] font-semibold uppercase tracking-[0.2em] text-cyan-300/75">
            {t('brand.flux_tagline')}
          </p>
        ) : null}
      </div>
    </div>
  );
}
