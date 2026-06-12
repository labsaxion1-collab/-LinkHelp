import { clsx } from 'clsx';
import { useLanguage } from '@/context/LanguageContext';

type Props = {
  className?: string;
  /** Show on all breakpoints (default: desktop only). */
  alwaysVisible?: boolean;
};

/** Discrete “by FLUX” attribution — hidden on mobile by default. */
export function ByFluxBadge({ className, alwaysVisible = false }: Props) {
  const { t } = useLanguage();

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em]',
        alwaysVisible ? 'inline-flex' : 'hidden md:inline-flex',
        className,
      )}
    >
      <span className="opacity-70">{t('brand.by_flux')}</span>
    </span>
  );
}
