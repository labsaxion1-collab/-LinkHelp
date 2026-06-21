import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import * as Icons from 'lucide-react';
import { clsx } from 'clsx';
import { LhButton } from '@/components/design-system/LhButton';
import { CLIENT_WELCOME_30_LC } from '@/config/onboardingRewards';
import type { ClientOnboardingCompleteAction } from '@/hooks/useClientOnboarding';

type TFn = (key: string, vars?: Record<string, string | number>) => string;

const SLIDE_KEYS = ['welcome', 'publish', 'helpers', 'compare', 'chat', 'bonus'] as const;
type SlideKey = (typeof SLIDE_KEYS)[number];

const SLIDE_ICONS: Record<SlideKey, typeof Icons.Sparkles> = {
  welcome: Icons.Sparkles,
  publish: Icons.FilePlus2,
  helpers: Icons.MapPin,
  compare: Icons.Users,
  chat: Icons.MessageCircle,
  bonus: Icons.Coins,
};

type Props = {
  open: boolean;
  completing: boolean;
  t: TFn;
  onComplete: (action: ClientOnboardingCompleteAction) => void | Promise<void>;
};

export function ClientOnboardingCarousel({ open, completing, t, onComplete }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const isLast = stepIndex === SLIDE_KEYS.length - 1;
  const slideKey = SLIDE_KEYS[stepIndex];
  const Icon = SLIDE_ICONS[slideKey];

  useEffect(() => {
    if (!open) {
      setStepIndex(0);
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[130] flex flex-col bg-[#F5F7FB]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="client-onboarding-title"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#2563FF]/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
      </div>

      <div className="relative flex flex-1 flex-col px-6 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-[max(env(safe-area-inset-top),1.5rem)] sm:px-10">
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
          <div className="flex items-center justify-center gap-2 py-2">
            {SLIDE_KEYS.map((key, idx) => (
              <span
                key={key}
                className={clsx(
                  'h-2 rounded-full transition-all duration-300',
                  idx === stepIndex ? 'w-8 bg-[#2563FF]' : 'w-2 bg-slate-300',
                )}
                aria-hidden
              />
            ))}
          </div>

          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-[28px] bg-white shadow-[0_20px_50px_rgba(37,99,255,0.15)] ring-1 ring-blue-100">
              <Icon className="h-11 w-11 text-[#2563FF]" strokeWidth={1.75} />
            </div>

            <h1
              id="client-onboarding-title"
              className="max-w-sm text-[28px] font-black leading-tight tracking-tight text-[#0B1220] sm:text-3xl"
            >
              {t(`client_onboarding.${slideKey}.title`)}
            </h1>
            <p className="mt-4 max-w-sm text-[15px] font-medium leading-relaxed text-[#64748B]">
              {t(`client_onboarding.${slideKey}.body`, { amount: CLIENT_WELCOME_30_LC })}
            </p>

            {slideKey === 'bonus' ? (
              <div className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-[#2563FF]/10 px-5 py-3 text-lg font-black text-[#2563FF] ring-1 ring-[#2563FF]/20">
                <Icons.Coins className="h-6 w-6" />
                {t('client_onboarding.bonus.amount_label', { amount: CLIENT_WELCOME_30_LC })}
              </div>
            ) : null}
          </div>

          <div className="mt-auto space-y-3 pb-2">
            {isLast ? (
              <>
                <LhButton
                  block
                  disabled={completing}
                  className="!min-h-[52px] !text-base !font-black"
                  onClick={() => onComplete('createRequest')}
                >
                  {completing ? (
                    <Icons.Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Icons.Plus className="h-5 w-5" />
                  )}
                  {t('client_onboarding.cta_create_request')}
                </LhButton>
                <LhButton
                  variant="secondary"
                  block
                  disabled={completing}
                  className="!min-h-[52px] !text-base !font-bold"
                  onClick={() => onComplete('explore')}
                >
                  {t('client_onboarding.cta_explore')}
                </LhButton>
              </>
            ) : (
              <>
                <LhButton
                  block
                  className="!min-h-[52px] !text-base !font-black"
                  onClick={() => setStepIndex((i) => Math.min(i + 1, SLIDE_KEYS.length - 1))}
                >
                  {stepIndex === 0 ? t('client_onboarding.cta_start') : t('client_onboarding.cta_next')}
                  <Icons.ArrowRight className="h-5 w-5" />
                </LhButton>
                {stepIndex > 0 ? (
                  <button
                    type="button"
                    onClick={() => setStepIndex((i) => Math.max(i - 1, 0))}
                    className="w-full py-2 text-sm font-bold text-[#64748B] transition-colors hover:text-[#0B1220]"
                  >
                    {t('client_onboarding.cta_back')}
                  </button>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
