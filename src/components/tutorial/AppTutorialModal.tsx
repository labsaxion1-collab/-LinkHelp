import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Banknote, BriefcaseBusiness, ChevronLeft, Plus, UserRound, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@/context/LanguageContext';
import { useTutorial } from '@/context/TutorialContext';
import { useAppMode } from '@/context/AppModeContext';
import { useSessionViewer } from '@/hooks/useSessionViewer';
import { markClientTutorialSeen } from '@/utils/clientTutorialStorage';
import { ClientOnboardingStepVisual } from '@/components/tutorial/ClientOnboardingTutorialVisuals';
import { ROUTES } from '@/utils/constants';

const CLIENT_STEP_COUNT = 6;
const HELPER_STEP_COUNT = 3;

const HELPER_ICONS = [BriefcaseBusiness, Banknote, UserRound] as const;

function ProgressDots({ total, active }: { total: number; active: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }).map((_, index) => (
        <span
          key={index}
          className={`h-2 rounded-full transition-all duration-300 ${
            index === active ? 'w-8 bg-[#2563FF]' : 'w-2 bg-[#CBD5E1]'
          }`}
        />
      ))}
    </div>
  );
}

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

  const currentStep = useMemo(() => {
    const index = step + 1;
    return {
      title: t(isClientFlow ? `${copyPrefix}.step${index}_title` : `${copyPrefix}.card${index}_title`),
      body: t(isClientFlow ? `${copyPrefix}.step${index}_body` : `${copyPrefix}.card${index}_desc`),
    };
  }, [step, t, isClientFlow, copyPrefix]);

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

  if (!isOpen) return null;

  const isLastStep = step === stepCount - 1;
  const HelperIcon = HELPER_ICONS[step];

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-[#0B1220]/45 backdrop-blur-[6px] sm:items-center sm:p-4"
      role="presentation"
      onClick={dismiss}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-tutorial-title"
        className="relative flex max-h-[min(94dvh,760px)] w-full max-w-[420px] flex-col overflow-hidden rounded-t-[2rem] bg-gradient-to-b from-[#F4F8FF] via-white to-[#EEF4FF] shadow-[0_-20px_80px_rgba(37,99,255,0.18)] animate-in slide-in-from-bottom-8 fade-in duration-300 sm:rounded-[2rem] sm:zoom-in-95"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-4 top-4 z-10 rounded-full bg-white/80 p-2 text-[#64748B] shadow-[0_8px_24px_rgba(37,99,255,0.1)] backdrop-blur-sm transition hover:text-[#0B1220]"
          aria-label={t('common.close')}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="shrink-0 px-6 pt-8">
          <ProgressDots total={stepCount} active={step} />
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-4 pt-6">
          {isClientFlow ? (
            <ClientOnboardingStepVisual step={step} />
          ) : (
            <div className="mx-auto flex w-full max-w-[280px] items-center justify-center rounded-[2rem] bg-white p-8 shadow-[0_24px_60px_rgba(37,99,255,0.12)] ring-1 ring-[#2563FF]/8">
              <span className="flex h-20 w-20 items-center justify-center rounded-[1.35rem] bg-[#EAF2FF] text-[#2563FF]">
                <HelperIcon className="h-10 w-10" />
              </span>
            </div>
          )}

          <div className="mt-8 text-center">
            <h2 id="app-tutorial-title" className="text-[1.65rem] font-black leading-tight tracking-tight text-[#0B1220]">
              {currentStep.title}
            </h2>
            <p className="mx-auto mt-3 max-w-[320px] text-sm font-medium leading-relaxed text-[#64748B]">{currentStep.body}</p>
          </div>

          {isClientFlow && step === 5 ? (
            <div className="mt-5 flex justify-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#EAF2FF] px-4 py-2 text-sm font-black text-[#2563FF] ring-1 ring-[#2563FF]/15">
                <img src="/brand/linkcredit-coin-icon.webp" alt="" className="h-5 w-5 object-contain" loading="lazy" decoding="async" />
                {t('client_onboarding_tutorial.credits_highlight')}
              </span>
            </div>
          ) : null}
        </div>

        <footer className="shrink-0 space-y-3 px-6 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-2">
          <button
            type="button"
            onClick={goNext}
            className="inline-flex min-h-[62px] w-full items-center justify-center gap-2 rounded-[1.75rem] bg-gradient-to-r from-[#2563FF] via-[#1B8FFF] to-[#4F8CFF] px-6 text-base font-black text-white shadow-[0_18px_40px_rgba(37,99,255,0.32)] transition hover:brightness-105"
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
        </footer>
      </div>
    </div>,
    document.body,
  );
}
