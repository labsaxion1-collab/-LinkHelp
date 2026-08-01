import { clsx } from 'clsx';
import { FLUX_PT } from '@/admin/fluxPtCopy';
import { useLanguage } from '@/context/LanguageContext';

type Props = {
  compact?: boolean;
  showTagline?: boolean;
  className?: string;
  /** When true, tagline is always pt-BR (admin console), ignoring marketplace language. */
  forcePtTagline?: boolean;
  /** Optional explicit tagline override (also bypasses LanguageContext). */
  tagline?: string;
};

/** FLUX wordmark for admin console — dark premium styling. */
export function FluxBrandMark({
  compact = false,
  showTagline = true,
  className,
  forcePtTagline = false,
  tagline,
}: Props) {
  const { t } = useLanguage();
  const resolvedTagline =
    tagline ?? (forcePtTagline ? FLUX_PT.brandTagline : t('brand.flux_tagline'));

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
            {resolvedTagline}
          </p>
        ) : null}
      </div>
    </div>
  );
}
