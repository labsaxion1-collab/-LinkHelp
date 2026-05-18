import { useEffect } from 'react';
import { X, Check, CheckCircle2, Sparkles, Flame, Crown } from 'lucide-react';
import { clsx } from 'clsx';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { HelperPlanBadge } from '@/components/helpers/HelperPlanBadge';
import { HELPER_PLAN_OPTIONS, planOptionForTier, type HelperPlanOption } from '@/utils/helperPlanConfig';
import type { HelperSubscriptionTier } from '@/types/helperSubscription';

export type HelperPlanModalView = 'current' | 'choose';

type Props = {
  view: HelperPlanModalView;
  currentTier: HelperSubscriptionTier;
  nextBillingLabel: string | null;
  onClose: () => void;
  onComparePlans: () => void;
};

function PlanIcon({ plan }: { plan: HelperPlanOption }) {
  const cls = 'w-7 h-7';
  if (plan.tier === 'BASIC') return <Sparkles className={cls} />;
  if (plan.tier === 'PRO_HELP') return <Crown className={cls} />;
  return <Flame className={cls} />;
}

function PlanCard({
  plan,
  currentTier,
  onChoose,
}: {
  key?: HelperSubscriptionTier;
  plan: HelperPlanOption;
  currentTier: HelperSubscriptionTier;
  onChoose: () => void;
}) {
  const { t } = useLanguage();
  const isCurrent = plan.tier === currentTier;
  const benefits = Array.from({ length: plan.benefitCount }, (_, i) =>
    t(`helper_dashboard.${plan.benefitPrefix}_${i + 1}`),
  );
  const highlightBenefits = benefits.slice(0, 4);

  return (
    <div
      className={clsx(
        'relative flex flex-col rounded-2xl border-2 p-5 sm:p-6 transition-shadow',
        isCurrent
          ? 'border-sky-500 bg-gradient-to-b from-sky-50/80 to-white ring-2 ring-sky-200/60 shadow-md'
          : plan.popular
            ? 'border-amber-400/80 bg-gradient-to-b from-slate-900 to-slate-950 text-white shadow-lg'
            : plan.professional
              ? 'border-violet-200 bg-gradient-to-b from-violet-50/60 to-white shadow-sm'
              : 'border-slate-200 bg-white shadow-sm',
      )}
    >
      {isCurrent ? (
        <span className="absolute -top-2.5 left-4 rounded-full bg-sky-600 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
          {t('helper_dashboard.plan_card_current')}
        </span>
      ) : null}
      {plan.popular && !isCurrent ? (
        <span className="absolute -top-2.5 right-4 rounded-full bg-amber-400 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-950">
          {t('helper_dashboard.upgrade_elite_popular_badge')}
        </span>
      ) : null}
      {plan.professional && !isCurrent ? (
        <span className="absolute -top-2.5 right-4 rounded-full bg-violet-600 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
          {t('helper_dashboard.upgrade_pro_help_professional_badge')}
        </span>
      ) : null}

      <div className="flex items-start justify-between gap-2 mb-4">
        <div
          className={clsx(
            'flex h-12 w-12 items-center justify-center rounded-xl shrink-0',
            isCurrent
              ? 'bg-sky-100 text-sky-700'
              : plan.popular
                ? 'bg-slate-800 text-amber-400'
                : plan.professional
                  ? 'bg-violet-100 text-violet-700'
                  : 'bg-slate-100 text-slate-600',
          )}
        >
          <PlanIcon plan={plan} />
        </div>
        <HelperPlanBadge tier={plan.tier} size="md" />
      </div>

      <h3
        className={clsx(
          'text-lg font-black tracking-tight',
          plan.popular && !isCurrent ? 'text-white' : 'text-slate-900',
        )}
      >
        {t(plan.nameKey)}
      </h3>
      <p
        className={clsx(
          'text-xs font-medium mt-1 leading-snug',
          plan.popular && !isCurrent ? 'text-slate-300' : 'text-slate-600',
        )}
      >
        {t(plan.taglineKey)}
      </p>
      <p
        className={clsx(
          'text-2xl font-black mt-3 tracking-tight',
          plan.popular && !isCurrent ? 'text-amber-400' : plan.professional ? 'text-violet-700' : 'text-slate-900',
        )}
      >
        {t(plan.priceKey)}
      </p>
      <p
        className={clsx(
          'text-[10px] font-semibold uppercase tracking-wide mt-1',
          plan.popular && !isCurrent ? 'text-slate-400' : 'text-slate-500',
        )}
      >
        {t(plan.priceLineKey)}
      </p>

      <dl className="mt-4 space-y-2 text-xs">
        <div>
          <dt className={clsx('font-bold uppercase tracking-wide', plan.popular && !isCurrent ? 'text-slate-400' : 'text-slate-500')}>
            {t('helper_dashboard.plan_card_applications_label')}
          </dt>
          <dd className={clsx('font-medium mt-0.5', plan.popular && !isCurrent ? 'text-slate-200' : 'text-slate-800')}>
            {t(plan.applicationsKey)}
          </dd>
        </div>
        <div>
          <dt className={clsx('font-bold uppercase tracking-wide', plan.popular && !isCurrent ? 'text-slate-400' : 'text-slate-500')}>
            {t('helper_dashboard.plan_card_badge_label')}
          </dt>
          <dd className={clsx('font-medium mt-0.5', plan.popular && !isCurrent ? 'text-slate-200' : 'text-slate-800')}>
            {t(plan.badgeKey)}
          </dd>
        </div>
      </dl>

      <ul className="mt-4 flex-1 space-y-2">
        {highlightBenefits.map((line) => (
          <li
            key={line}
            className={clsx(
              'flex gap-2 text-xs font-medium leading-snug',
              plan.popular && !isCurrent ? 'text-slate-200' : 'text-slate-700',
            )}
          >
            <CheckCircle2
              className={clsx(
                'w-4 h-4 shrink-0 mt-0.5',
                plan.popular && !isCurrent ? 'text-amber-400' : plan.professional ? 'text-violet-600' : 'text-sky-600',
              )}
            />
            {line}
          </li>
        ))}
      </ul>

      <button
        type="button"
        disabled={isCurrent}
        onClick={onChoose}
        className={clsx(
          'mt-5 w-full py-2.5 rounded-xl text-sm font-bold transition-colors min-h-[44px]',
          isCurrent
            ? 'bg-slate-100 text-slate-500 cursor-default'
            : plan.popular
              ? 'bg-amber-400 text-amber-950 hover:bg-amber-300'
              : 'bg-slate-900 text-white hover:bg-black',
        )}
      >
        {isCurrent ? t('helper_dashboard.plan_card_current') : t('helper_dashboard.plan_card_choose')}
      </button>
    </div>
  );
}

export function HelperSubscriptionPlanModal({
  view,
  currentTier,
  nextBillingLabel,
  onClose,
  onComparePlans,
}: Props) {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const currentPlan = planOptionForTier(currentTier);
  const currentBenefits = Array.from({ length: currentPlan.benefitCount }, (_, i) =>
    t(`helper_dashboard.${currentPlan.benefitPrefix}_${i + 1}`),
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleChoose = () => {
    showToast(t('helper_dashboard.plan_payment_soon'), 'info');
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/55 backdrop-blur-sm animate-in fade-in duration-200"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="helper-plan-modal-title"
        className="bg-white w-full sm:max-w-4xl lg:max-w-5xl max-h-[92dvh] sm:max-h-[88vh] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-5 sm:p-6 border-b border-slate-100 shrink-0">
          <div className="min-w-0">
            <h2 id="helper-plan-modal-title" className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {view === 'current' ? t('helper_dashboard.plan_modal_your_plan') : t('helper_dashboard.plan_modal_choose_plan')}
            </h2>
            <p className="text-sm text-slate-500 font-medium mt-1">
              {view === 'current' ? t('helper_dashboard.plan_modal_your_plan_sub') : t('helper_dashboard.upgrade_modal_subtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 shrink-0"
            aria-label={t('common.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6">
          {view === 'current' ? (
            <div className="max-w-lg mx-auto space-y-5">
              <div className="rounded-2xl border-2 border-sky-200 bg-gradient-to-br from-sky-50/90 to-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {t('helper_dashboard.plan_current')}
                  </span>
                  <HelperPlanBadge tier={currentTier} size="md" />
                </div>
                <h3 className="text-2xl font-black text-slate-900">{t(currentPlan.nameKey)}</h3>
                <p className="text-sm text-slate-600 mt-1">{t(currentPlan.taglineKey)}</p>
                <p className="text-xl font-black text-sky-800 mt-3">{t(currentPlan.priceKey)}</p>
                {nextBillingLabel ? (
                  <p className="text-xs text-slate-600 mt-2">
                    <span className="font-semibold">{t('helper_dashboard.subscription_next_billing')}</span> {nextBillingLabel}
                  </p>
                ) : (
                  <p className="text-xs text-slate-600 mt-2">{t('helper_dashboard.subscription_no_billing')}</p>
                )}
                <div className="mt-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                    {t('helper_dashboard.subscription_benefits_heading')}
                  </p>
                  <ul className="space-y-2">
                    {currentBenefits.map((line) => (
                      <li key={line} className="flex gap-2 text-sm text-slate-700 font-medium">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" strokeWidth={2.5} />
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <button
                type="button"
                onClick={onComparePlans}
                className="w-full py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition-colors min-h-[48px]"
              >
                {t('helper_dashboard.plan_modal_compare')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
              {HELPER_PLAN_OPTIONS.map((plan) => (
                <PlanCard key={plan.tier} plan={plan} currentTier={currentTier} onChoose={handleChoose} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
