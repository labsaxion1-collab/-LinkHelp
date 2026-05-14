import { clsx } from 'clsx';
import { useLanguage } from '@/context/LanguageContext';
import type { HelperSubscriptionTier } from '@/types/helperSubscription';

const tierStyles: Record<HelperSubscriptionTier, string> = {
  BASIC: 'bg-sky-50 text-sky-900 border-sky-200/90',
  ELITE: 'bg-gradient-to-r from-slate-800 to-slate-900 text-amber-100 border-amber-400/50 ring-1 ring-amber-400/35',
  PRO_HELP: 'bg-gradient-to-r from-violet-50 to-purple-50 text-violet-900 border-violet-300/80 ring-1 ring-violet-200/60',
};

type Size = 'sm' | 'md';

const sizeStyles: Record<Size, string> = {
  sm: 'text-[9px] px-1.5 py-0.5 rounded-md tracking-wide',
  md: 'text-[10px] px-2 py-1 rounded-lg tracking-wider',
};

export function HelperPlanBadge({
  tier,
  size = 'sm',
  className,
}: {
  tier: HelperSubscriptionTier;
  size?: Size;
  className?: string;
}) {
  const { t } = useLanguage();
  return (
    <span
      className={clsx(
        'inline-flex shrink-0 items-center justify-center font-black uppercase border shadow-sm',
        tierStyles[tier],
        sizeStyles[size],
        className,
      )}
    >
      {t(`helper_plan.tier_${tier}`)}
    </span>
  );
}
