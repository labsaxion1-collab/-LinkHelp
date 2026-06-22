import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ChevronLeft, Loader2, Plus } from 'lucide-react';
import { clsx } from 'clsx';
import { CLIENT_WELCOME_30_LC } from '@/config/onboardingRewards';
import { TutorialCompareProposalsHero, TutorialLinkCreditsHero, TutorialNearbyHelpersHero, TutorialPublishStepHero, TutorialSecureChatHero, TutorialWelcomeHero } from '@/components/tutorial/ClientOnboardingTutorialVisuals';
import { TutorialCenterCard, TutorialSlidePanel } from '@/components/tutorial/TutorialCenterCard';
import type { ClientOnboardingCompleteAction } from '@/hooks/useClientOnboarding';

type TFn = (key: string, vars?: Record<string, string | number>) => string;

const STEP_COUNT = 6;

type Props = {
  open: boolean;
  completing: boolean;
  t: TFn;
  onComplete: (action: ClientOnboardingCompleteAction) => void | Promise<void>;
  onSkip?: () => void | Promise<void>;
};

export function ClientOnboardingCarousel({ open, completing, t, onComplete, onSkip }: Props) {
  const [step, setStep] = useState(0);
  const isLast = step === STEP_COUNT - 1;
  const slideVars = { amount: CLIENT_WELCOME_30_LC };

  useEffect(() => {
    if (!open) setStep(0);
  }, [open]);

  const handleSkip = () => {
    if (onSkip) {
      void onSkip();
      return;
    }
    void onComplete('explore');
  };

  const slides = useMemo(() => {
    return Array.from({ length: STEP_COUNT }, (_, index) => {
      const slideIndex = index + 1;
      const title = t(`client_onboarding_tutorial.step${slideIndex}_title`);
      const body = t(`client_onboarding_tutorial.step${slideIndex}_body`);

      const isFullBleedStep = index <= 5;
      const isFilledStep = isFullBleedStep;

      return (
        <TutorialSlidePanel key={index} flush={isFullBleedStep} fill={isFilledStep}>
          {index === 0 ? (
            <TutorialWelcomeHero
              titleId={index === step ? 'client-onboarding-title' : undefined}
              body={t('client_onboarding_tutorial.step1_body')}
            />
          ) : index === 1 ? (
            <TutorialPublishStepHero
              titleId={index === step ? 'client-onboarding-title' : undefined}
              title={title}
              body={body}
              pulseNavCreate={step === 1}
            />
          ) : index === 2 ? (
            <TutorialNearbyHelpersHero
              titleId={index === step ? 'client-onboarding-title' : undefined}
              title={title}
              body={body}
            />
          ) : index === 3 ? (
            <TutorialCompareProposalsHero
              titleId={index === step ? 'client-onboarding-title' : undefined}
              title={title}
              body={body}
            />
          ) : index === 4 ? (
            <TutorialSecureChatHero
              titleId={index === step ? 'client-onboarding-title' : undefined}
              title={title}
              body={body}
            />
          ) : (
            <TutorialLinkCreditsHero
              titleId={index === step ? 'client-onboarding-title' : undefined}
              title={t('client_onboarding.bonus.title', slideVars)}
              body={t('client_onboarding.bonus.body', slideVars)}
              creditsLabel={t('client_onboarding.bonus.amount_label', slideVars)}
              celebrate={step === 5}
            />
          )}
        </TutorialSlidePanel>
      );
    });
  }, [step, t]);

  if (!open) return null;

  return (
    <TutorialCenterCard
      open={open}
      step={step}
      stepCount={STEP_COUNT}
      onStepChange={setStep}
      onDismiss={handleSkip}
      onSkip={handleSkip}
      skipLabel={t('client_onboarding_tutorial.skip')}
      closeLabel={t('common.close')}
      zIndex={130}
      titleId="client-onboarding-title"
      controlsOnImage={step <= 5}
      immersiveLayout={step <= 5}
      swipeHint
      footerBlurOverlay={false}
      footer={
        isLast ? (
          <>
            <button
              type="button"
              disabled={completing}
              onClick={() => onComplete('createRequest')}
              className={clsx(
                'inline-flex min-h-[62px] w-full items-center justify-center gap-2 rounded-[1.75rem] bg-gradient-to-r from-[#2563FF] via-[#1B8FFF] to-[#4F8CFF] px-6 text-base font-black text-white shadow-[0_18px_40px_rgba(37,99,255,0.32)] transition hover:brightness-105 disabled:opacity-70',
                'lh-tutorial-celebration-cta-glow',
              )}
            >
              {completing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" strokeWidth={3} />}
              {t('client_onboarding.cta_create_request')}
            </button>
            <button
              type="button"
              disabled={completing}
              onClick={() => onComplete('explore')}
              className="inline-flex min-h-[48px] w-full items-center justify-center rounded-[1.25rem] text-sm font-black text-[#2563FF] transition hover:bg-[#2563FF]/5 disabled:opacity-70"
            >
              {t('client_onboarding.cta_explore')}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setStep((prev) => Math.min(prev + 1, STEP_COUNT - 1))}
              className="inline-flex min-h-[62px] w-full items-center justify-center gap-2 rounded-[1.75rem] bg-gradient-to-r from-[#2563FF] via-[#1B8FFF] to-[#4F8CFF] px-6 text-base font-black text-white shadow-[0_18px_40px_rgba(37,99,255,0.32)] transition hover:brightness-105"
            >
              {step === 0 ? t('client_onboarding.cta_start') : t('client_onboarding.cta_next')}
              <ArrowRight className="h-5 w-5" />
            </button>
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep((prev) => Math.max(prev - 1, 0))}
                className="inline-flex min-h-[48px] w-full items-center justify-center gap-1 text-sm font-bold text-[#64748B] transition hover:text-[#0B1220]"
              >
                <ChevronLeft className="h-4 w-4" />
                {t('client_onboarding.cta_back')}
              </button>
            ) : null}
          </>
        )
      }
    >
      {slides}
    </TutorialCenterCard>
  );
}
