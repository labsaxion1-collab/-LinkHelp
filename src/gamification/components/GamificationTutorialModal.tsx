import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ChevronLeft } from 'lucide-react';
import { clsx } from 'clsx';
import { useLanguage } from '@/context/LanguageContext';
import { TutorialCenterCard, TutorialSlidePanel } from '@/components/tutorial/TutorialCenterCard';
import type { UserType } from '@/gamification/types/gamification';
import { getGamificationTutorialCards } from '@/gamification/config/gamificationTutorialContent';
import { GamificationTutorialSlide } from '@/gamification/components/GamificationTutorial';

type Props = {
  open: boolean;
  onClose: () => void;
  userType: UserType;
};

/** Tutorial de gamificação — mesmo card central do tutorial da barra superior. */
export function GamificationTutorialModal({ open, onClose, userType }: Props) {
  const { t } = useLanguage();
  const cards = getGamificationTutorialCards(userType);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!open) return;
    setStep(0);
  }, [open, userType]);

  const goNext = () => {
    if (step < cards.length - 1) {
      setStep((prev) => prev + 1);
      return;
    }
    onClose();
  };

  const goBack = () => {
    if (step > 0) setStep((prev) => prev - 1);
  };

  const slides = useMemo(
    () =>
      cards.map((card, index) => (
        <TutorialSlidePanel key={card.id}>
          <GamificationTutorialSlide
            card={card}
            titleId={index === step ? 'gamification-tutorial-title' : undefined}
          />
        </TutorialSlidePanel>
      )),
    [cards, step],
  );

  if (!open) return null;

  const isLastStep = step === cards.length - 1;

  return (
    <TutorialCenterCard
      open={open}
      step={step}
      stepCount={cards.length}
      onStepChange={setStep}
      onDismiss={onClose}
      onSkip={onClose}
      skipLabel={t('client_onboarding_tutorial.skip')}
      closeLabel={t('common.close')}
      titleId="gamification-tutorial-title"
      zIndex={1000}
      footer={
        <>
          <button
            type="button"
            onClick={goNext}
            className="inline-flex min-h-[62px] w-full items-center justify-center gap-2 rounded-[1.75rem] bg-gradient-to-r from-[#2563FF] via-[#1B8FFF] to-[#4F8CFF] px-6 text-base font-black text-white shadow-[0_18px_40px_rgba(37,99,255,0.32)] transition hover:brightness-105"
          >
            {isLastStep ? t('client_onboarding_tutorial.finish') : t('client_onboarding_tutorial.next')}
            {!isLastStep ? <ArrowRight className="h-5 w-5" /> : null}
          </button>

          {step > 0 ? (
            <button
              type="button"
              onClick={goBack}
              className={clsx(
                'inline-flex min-h-[48px] w-full items-center justify-center gap-1 text-sm font-bold text-[#64748B] transition hover:text-[#0B1220]',
              )}
            >
              <ChevronLeft className="h-4 w-4" />
              {t('client_onboarding_tutorial.back')}
            </button>
          ) : null}
        </>
      }
    >
      {slides}
    </TutorialCenterCard>
  );
}
