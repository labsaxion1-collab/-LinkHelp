import { Coins, CheckCircle2, Circle } from 'lucide-react';
import { clsx } from 'clsx';
import { useLanguage } from '@/context/LanguageContext';
import { useOnboardingRewards } from '@/hooks/useOnboardingRewards';
import { formatLinkCredits } from '@/utils/formatLinkCredits';
import { rewardAmountForType } from '@/config/onboardingRewards';

type Props = {
  skillCount?: number;
  className?: string;
};

export function ProfileRewardsProgress({ skillCount = 0, className }: Props) {
  const { t, language } = useLanguage();
  const { profileChecks, grantedTypes } = useOnboardingRewards();

  const checks = profileChecks.map((c) => {
    if (c.id === 'PROFILE_SKILLS') {
      return { ...c, done: c.granted || skillCount >= 1 };
    }
    return c;
  });

  const doneCount = checks.filter((c) => c.done || c.granted).length;
  const percent = checks.length ? Math.round((doneCount / checks.length) * 100) : 0;

  return (
    <section
      className={clsx(
        'rounded-2xl border border-blue-100/90 bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/20 p-4 shadow-sm',
        className,
      )}
      aria-labelledby="profile-rewards-progress-title"
    >
      <motionHeader percent={percent} t={t} />

      <ul className="mt-4 space-y-2">
        {checks.map((check) => {
          const amount = rewardAmountForType(check.rewardType);
          const complete = check.done || check.granted;
          const claimed = grantedTypes.has(check.rewardType);
          return (
            <li
              key={check.id}
              className={clsx(
                'flex items-start gap-3 rounded-xl border px-3 py-2.5 text-sm transition-all duration-200',
                complete
                  ? 'border-emerald-200/80 bg-emerald-50/60'
                  : 'border-slate-200/80 bg-white/90',
              )}
            >
              {complete ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 shrink-0 text-slate-300" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold text-slate-900">{t(check.labelKey)}</p>
                  <span
                    className={clsx(
                      'text-xs font-black tabular-nums',
                      complete ? 'text-emerald-700' : 'text-blue-600',
                    )}
                  >
                    +{formatLinkCredits(amount, language)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs font-medium text-slate-500">{t(check.hintKey)}</p>
                {claimed ? (
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-emerald-600">
                    {t('rewards.check_claimed')}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function motionHeader({
  percent,
  t,
}: {
  percent: number;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
        <Coins className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p
          id="profile-rewards-progress-title"
          className="text-[10px] font-black uppercase tracking-[0.12em] text-blue-600/90"
        >
          {t('rewards.progress_title')}
        </p>
        <p className="mt-1 text-lg font-black text-slate-950">{t('rewards.progress_sub', { percent })}</p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200/80">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500 ease-out"
            style={{ width: `${percent}%` }}
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>
    </div>
  );
}
