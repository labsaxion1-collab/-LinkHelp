import { clsx } from 'clsx';
import { BRAND_ASSETS } from '@/assets/brand';
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
    <div className={clsx('flex min-w-0 items-center gap-3', className)}>
      <div
        className={clsx(
          'relative shrink-0 overflow-hidden rounded-2xl ring-1 ring-cyan-400/20',
          compact ? 'h-9 w-9' : 'h-11 w-11',
        )}
      >
        <img
          src={BRAND_ASSETS.fluxLogo}
          alt=""
          className="h-full w-full object-cover"
          loading="eager"
          decoding="async"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-400/10 via-transparent to-violet-600/15"
        />
      </div>
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
