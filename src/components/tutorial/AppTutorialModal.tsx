import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Banknote, BriefcaseBusiness, ChevronLeft, Plus, UserRound } from 'lucide-react';
import { clsx } from 'clsx';
import { useLanguage } from '@/context/LanguageContext';
import { useTutorial } from '@/context/TutorialContext';
import { useAppMode } from '@/context/AppModeContext';
import { useSessionViewer } from '@/hooks/useSessionViewer';
import { markClientTutorialSeen } from '@/utils/clientTutorialStorage';
import { TutorialCompareProposalsHero, TutorialLinkCreditsHero, TutorialNearbyHelpersHero, TutorialPublishStepHero, TutorialSecureChatHero, TutorialWelcomeHero } from '@/components/tutorial/ClientOnboardingTutorialVisuals';
import { TutorialCenterCard, TutorialSlidePanel } from '@/components/tutorial/TutorialCenterCard';
import { ROUTES } from '@/utils/constants';

const CLIENT_STEP_COUNT = 6;
const HELPER_STEP_COUNT = 3;

const HELPER_ICONS = [BriefcaseBusiness, Banknote, UserRound] as const;

export function AppTutorialModal() {
  const { isOpen, closeTutorial } = useTutorial();
  const { t } = useLanguage();
  const { isHelperMode } = useAppMode();
  const me = useSessionViewer();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const isClientFlow = !isHelperMode;
  const stepCount = isClientFlow ? CLIENT_STEP_COUNT : HELPER_STEP_COUNT;
  const copyPrefix = isClientFlow ? 'client_onboarding_tutorial' : 'app_tutorial.helper';

  useEffect(() => {
    if (!isOpen) return;
    setStep(0);
  }, [isOpen, isClientFlow]);

  const dismiss = () => {
    if (isClientFlow && me.id) markClientTutorialSeen(me.id);
    closeTutorial();
  };

  const goNext = () => {
    if (step < stepCount - 1) {
      setStep((prev) => prev + 1);
      return;
    }
    dismiss();
  };

  const goBack = () => {
    if (step > 0) setStep((prev) => prev - 1);
  };

  const primaryLabel = () => {
    if (!isClientFlow) return step === stepCount - 1 ? t('client_onboarding_tutorial.finish') : t('client_onboarding_tutorial.next');
    if (step === 0) return t('client_onboarding_tutorial.start');
    if (step === 4) return t('client_onboarding_tutorial.continue');
    if (step === 5) return t('client_onboarding_tutorial.finish_primary');
    return t('client_onboarding_tutorial.next');
  };

  const slides = useMemo(() => {
    return Array.from({ length: stepCount }, (_, index) => {
      const slideIndex = index + 1;
      const title = t(isClientFlow ? `${copyPrefix}.step${slideIndex}_title` : `${copyPrefix}.card${slideIndex}_title`);
      const body = t(isClientFlow ? `${copyPrefix}.step${slideIndex}_body` : `${copyPrefix}.card${slideIndex}_desc`);
      const HelperIcon = HELPER_ICONS[index];

      const isFullBleedClientStep = isClientFlow && index <= 5;
      const isFilledClientStep = isFullBleedClientStep;

      return (
        <TutorialSlidePanel key={index} flush={isFullBleedClientStep} fill={isFilledClientStep}>
          {index === 0 && isClientFlow ? (
            <TutorialWelcomeHero
              titleId={index === step ? 'app-tutorial-title' : undefined}
              body={t('client_onboarding_tutorial.step1_body')}
            />
          ) : index === 1 && isClientFlow ? (
            <TutorialPublishStepHero
              titleId={index === step ? 'app-tutorial-title' : undefined}
              title={title}
              body={body}
              pulseNavCreate={step === 1}
            />
          ) : index === 2 && isClientFlow ? (
            <TutorialNearbyHelpersHero
              titleId={index === step ? 'app-tutorial-title' : undefined}
              title={title}
              body={body}
            />
          ) : index === 3 && isClientFlow ? (
            <TutorialCompareProposalsHero
              titleId={index === step ? 'app-tutorial-title' : undefined}
              title={title}
              body={body}
            />
          ) : index === 4 && isClientFlow ? (
            <TutorialSecureChatHero
              titleId={index === step ? 'app-tutorial-title' : undefined}
              title={title}
              body={body}
            />
          ) : index === 5 && isClientFlow ? (
            <TutorialLinkCreditsHero
              titleId={index === step ? 'app-tutorial-title' : undefined}
              title={title}
              body={body}
              creditsLabel={t('client_onboarding_tutorial.credits_highlight')}
              celebrate={step === 5}
            />
          ) : (
            <>
              <div className="mx-auto flex w-full max-w-[280px] items-center justify-center rounded-[2rem] bg-white p-8 shadow-[0_24px_60px_rgba(37,99,255,0.12)] ring-1 ring-[#2563FF]/8">
                <span className="flex h-20 w-20 items-center justify-center rounded-[1.35rem] bg-[#EAF2FF] text-[#2563FF]">
                  <HelperIcon className="h-10 w-10" />
                </span>
              </div>

              <div className="mt-8 text-center">
                <h2
                  id={index === step ? 'app-tutorial-title' : undefined}
                  className="text-[1.65rem] font-black leading-tight tracking-tight text-[#0B1220]"
                >
                  {title}
                </h2>
                <p className="mx-auto mt-3 max-w-[320px] text-sm font-medium leading-relaxed text-[#64748B]">{body}</p>
              </div>
            </>
          )}
        </TutorialSlidePanel>
      );
    });
  }, [copyPrefix, isClientFlow, step, stepCount, t]);

  if (!isOpen) return null;

  const isLastStep = step === stepCount - 1;

  return (
    <TutorialCenterCard
      open={isOpen}
      step={step}
      stepCount={stepCount}
      onStepChange={setStep}
      onDismiss={dismiss}
      onSkip={dismiss}
      skipLabel={t('client_onboarding_tutorial.skip')}
      closeLabel={t('common.close')}
      titleId="app-tutorial-title"
      controlsOnImage={isClientFlow && step <= 5}
      immersiveLayout={isClientFlow && step <= 5}
      swipeHint={isClientFlow}
      footerBlurOverlay={false}
      footer={
        <>
          <button
            type="button"
            onClick={goNext}
            className={clsx(
              'inline-flex min-h-[62px] w-full items-center justify-center gap-2 rounded-[1.75rem] bg-gradient-to-r from-[#2563FF] via-[#1B8FFF] to-[#4F8CFF] px-6 text-base font-black text-white shadow-[0_18px_40px_rgba(37,99,255,0.32)] transition hover:brightness-105',
              isClientFlow && isLastStep && 'lh-tutorial-celebration-cta-glow',
            )}
          >
            {isClientFlow && isLastStep ? <Plus className="h-5 w-5" strokeWidth={3} /> : null}
            {primaryLabel()}
            {!isLastStep || !isClientFlow ? <ArrowRight className="h-5 w-5" /> : null}
          </button>

          {isClientFlow && isLastStep ? (
            <button
              type="button"
              onClick={dismiss}
              className="inline-flex min-h-[48px] w-full items-center justify-center rounded-[1.25rem] text-sm font-black text-[#2563FF] transition hover:bg-[#2563FF]/5"
            >
              {t('client_onboarding_tutorial.finish_secondary')}
            </button>
          ) : step > 0 ? (
            <button
              type="button"
              onClick={goBack}
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-1 text-sm font-bold text-[#64748B] transition hover:text-[#0B1220]"
            >
              <ChevronLeft className="h-4 w-4" />
              {t('client_onboarding_tutorial.back')}
            </button>
          ) : null}

          {!isClientFlow && isLastStep ? (
            <button
              type="button"
              onClick={() => {
                dismiss();
                navigate(ROUTES.howItWorks);
              }}
              className="inline-flex min-h-[48px] w-full items-center justify-center rounded-[1.25rem] text-sm font-bold text-[#64748B] transition hover:text-[#0B1220]"
            >
              {t('app_tutorial.learn_more')}
            </button>
          ) : null}
        </>
      }
    >
      {slides}
    </TutorialCenterCard>
  );
}
