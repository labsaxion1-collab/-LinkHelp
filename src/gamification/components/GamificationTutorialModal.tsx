import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ChevronLeft } from 'lucide-react';
import { clsx } from 'clsx';
import { useLanguage } from '@/context/LanguageContext';
import { TutorialCenterCard, TutorialSlidePanel } from '@/components/tutorial/TutorialCenterCard';
import type { UserType } from '@/gamification/types/gamification';
import { getGamificationTutorialCards } from '@/gamification/config/gamificationTutorialContent';
import { GamificationTutorialSlide } from '@/gamification/components/GamificationTutorial';

import { useGamification } from '@/gamification/hooks/useGamification';
import { getProgressToNextLevel, listMissingRequirements } from '@/gamification/engines/progressEngine';
import { EMPTY_GAMIFICATION_STATS } from '@/gamification/services/gamificationStatsAdapter';
import { CLIENT_LEVELS } from '@/gamification/config/clientLevels';
import { HELPER_LEVELS } from '@/gamification/config/helperLevels';
type Props = {
  open: boolean;
  onClose: () => void;
  userType: UserType;
  /** When set, carousel opens on this card id (current level slide). */
  initialCardId?: string;
  /** Called when user taps Voltar on the first step (e.g. return to rank detail). */
  onBackFromFirstStep?: () => void;
};

/** Tutorial de gamificação — mesmo card central do tutorial da barra superior. */
export function GamificationTutorialModal({
  open,
  onClose,
  userType,
  initialCardId,
  onBackFromFirstStep,
}: Props) {
  const { t } = useLanguage();
  const { record } = useGamification(userType);
  const progress = record?.levelKey
    ? getProgressToNextLevel(userType, record.score, record.stats ?? EMPTY_GAMIFICATION_STATS, record.levelKey)
    : null;
  const staticCards = getGamificationTutorialCards(userType);
  const tutorialLevelName = (key: string, fallback: string) =>
    userType === 'helper' && key === 'confiavel' ? 'Helper Iniciante' : fallback;
  const currentCard = progress && record ? {
    id: 'current-progress',
    title: progress.nextLevel ? `Como virar ${tutorialLevelName(progress.nextLevel.key, progress.nextLevel.name)}?` : 'Nível máximo alcançado',
    body: progress.nextLevel
      ? 'Para conquistar seu próximo nível, você precisa:'
      : 'Você já chegou à medalha mais alta desta jornada.',
    heroKey: record.heroKey,
    nextHeroKey: progress.nextLevel?.heroKey,
    currentLevelName: tutorialLevelName(progress.currentLevel.key, progress.currentLevel.name),
    nextLevelName: progress.nextLevel ? tutorialLevelName(progress.nextLevel.key, progress.nextLevel.name) : undefined,
    statusCopy: userType === 'client' ? 'Você começou sua jornada na LinkHelp!' : 'Sua jornada profissional começa aqui!',
    requirements: progress.nextLevel
      ? [
          ...(progress.pointsToNext > 0 ? [`Alcançar mais ${progress.pointsToNext} pontos`] : []),
          ...progress.missingRequirements,
        ]
      : [],
    benefit: userType === 'client'
      ? 'Aumente sua credibilidade e atraia helpers mais qualificados para seus pedidos.'
      : 'Ganhe mais credibilidade e destaque para conquistar novas oportunidades.',
    isCurrentProgress: true,
  } : null;
  const clientOuroLevel = CLIENT_LEVELS.find((level) => level.key === 'ouro');
  const clientOuroCard = userType === 'client' && record && clientOuroLevel ? {
    id: 'client-confiavel-ouro',
    title: 'Como virar Cliente Ouro?',
    body: 'Para alcançar o próximo nível, você precisa:',
    heroKey: 'client_confiavel',
    nextHeroKey: 'client_ouro',
    currentLevelName: 'Cliente Confiável',
    nextLevelName: 'Cliente Ouro',
    statusCopy: 'Você já está construindo uma ótima reputação!',
    requirements: [
      ...(record.score < clientOuroLevel.scoreMin
        ? [`Alcançar mais ${clientOuroLevel.scoreMin - record.score} pontos`]
        : []),
      ...listMissingRequirements(
        record.stats ?? EMPTY_GAMIFICATION_STATS,
        clientOuroLevel.requirements,
      ),
    ],
    benefit: 'Tenha mais destaque e reconhecimento na LinkHelp. Helpers confiarão ainda mais em você.',
    isCurrentProgress: true,
  } : null;
  const clientVipLevel = CLIENT_LEVELS.find((level) => level.key === 'vip');
  const clientVipCard = userType === 'client' && record && clientVipLevel ? {
    id: 'client-ouro-vip',
    title: 'Como virar Cliente VIP?',
    body: 'Para alcançar o próximo nível, você precisa:',
    heroKey: 'client_ouro',
    nextHeroKey: 'client_vip',
    currentLevelName: 'Cliente Ouro',
    nextLevelName: 'Cliente VIP',
    statusCopy: 'Você já tem um ótimo histórico na LinkHelp!',
    requirements: [
      ...(record.score < clientVipLevel.scoreMin
        ? [`Alcançar mais ${clientVipLevel.scoreMin - record.score} pontos`]
        : []),
      ...listMissingRequirements(
        record.stats ?? EMPTY_GAMIFICATION_STATS,
        clientVipLevel.requirements,
      ),
    ],
    benefit: 'Seu perfil ganha ainda mais destaque. Você se torna um cliente VIP e atrai os melhores helpers.',
    isCurrentProgress: true,
  } : null;
  const clientEliteLevel = CLIENT_LEVELS.find((level) => level.key === 'elite');
  const clientEliteCard = userType === 'client' && record && clientEliteLevel ? {
    id: 'client-vip-elite',
    title: 'Como virar Cliente Elite?',
    body: 'Para alcançar o próximo nível, você precisa:',
    heroKey: 'client_vip',
    nextHeroKey: 'client_elite',
    currentLevelName: 'Cliente VIP',
    nextLevelName: 'Cliente Elite',
    statusCopy: 'Você é um cliente de alto nível na LinkHelp!',
    requirements: [
      ...(record.score < clientEliteLevel.scoreMin
        ? [`Alcançar mais ${clientEliteLevel.scoreMin - record.score} pontos`]
        : []),
      ...listMissingRequirements(
        record.stats ?? EMPTY_GAMIFICATION_STATS,
        clientEliteLevel.requirements,
      ),
    ],
    benefit: 'Você se torna uma referência na LinkHelp. Os melhores helpers querem trabalhar com você.',
    isCurrentProgress: true,
  } : null;
  const clientMaxCard = userType === 'client' ? {
    id: 'client-elite-max',
    title: 'Cliente Elite',
    body: 'Você alcançou o topo da LinkHelp!',
    heroKey: 'client_elite',
    currentLevelName: 'Cliente Elite',
    statusCopy: 'Você é referência entre os clientes da plataforma.',
    isMaxLevel: true,
    exclusiveBenefits: [
      { title: 'Máximo destaque', body: 'Seu perfil recebe o maior reconhecimento na plataforma.' },
      { title: 'Atendimento prioritário', body: 'Suporte e respostas mais rápidas.' },
      { title: 'Condições exclusivas', body: 'Acesso aos benefícios disponíveis para clientes Elite.' },
      { title: 'Confiança máxima', body: 'Histórico e reputação que inspiram confiança.' },
    ],
    maintenanceTips: [
      'Avalie os helpers após cada serviço',
      'Responda rapidamente às mensagens',
      'Conclua seus pedidos pela plataforma',
      'Evite cancelamentos desnecessários',
      'Mantenha um excelente histórico',
    ],
    recognitionCopy: 'Seu compromisso e suas boas escolhas ajudam a construir uma comunidade melhor para todos.',
  } : null;
  const clientSummaryCard = userType === 'client' ? {
    id: 'client-level-summary',
    title: 'Parabéns! Você chegou ao final',
    body: 'Conheça todos os níveis para clientes e as vantagens conquistadas na LinkHelp.',
    isLevelSummary: true,
  } : null;
  const clientFutureCards = [
    clientOuroCard,
    clientVipCard,
    clientEliteCard,
    clientMaxCard,
    clientSummaryCard,
  ].flatMap((card) => card ? [card] : []);
  const clientLevelIndex = progress
    ? CLIENT_LEVELS.findIndex((level) => level.key === progress.currentLevel.key)
    : -1;
  const clientCards = currentCard && clientLevelIndex >= 0
    ? clientLevelIndex >= CLIENT_LEVELS.length - 1
      ? clientFutureCards.slice(3)
      : [currentCard, ...clientFutureCards.slice(clientLevelIndex)]
    : staticCards;
  const helperLevelIndex = progress
    ? HELPER_LEVELS.findIndex((level) => level.key === progress.currentLevel.key)
    : -1;
  const helperCards = currentCard && helperLevelIndex >= 0
    ? helperLevelIndex >= HELPER_LEVELS.length - 1
      ? staticCards.slice(-2)
      : [currentCard, ...staticCards.slice(helperLevelIndex + 1)]
    : staticCards;
  const cards = userType === 'client' ? clientCards : helperCards;
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!open) return;
    if (initialCardId) {
      const idx = cards.findIndex((card) => card.id === initialCardId);
      setStep(idx >= 0 ? idx : 0);
      return;
    }
    setStep(0);
  }, [open, userType, initialCardId, cards]);
  useEffect(() => {
    setStep((current) => Math.min(current, Math.max(0, cards.length - 1)));
  }, [cards.length]);


  const goNext = () => {
    if (step < cards.length - 1) {
      setStep((prev) => prev + 1);
      return;
    }
    onClose();
  };

  const goBack = () => {
    if (step > 0) {
      setStep((prev) => prev - 1);
      return;
    }
    if (onBackFromFirstStep) {
      onBackFromFirstStep();
      return;
    }
    onClose();
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
      headerLabel={userType === 'helper' ? 'Tutorial de níveis - Helper' : 'Tutorial de níveis'}
      closeLabel={t('common.close')}
      titleId="gamification-tutorial-title"
      zIndex={1000}
      premiumStickyHeader={userType === 'helper'}
      footer={
        <>
          <button
            type="button"
            onClick={goNext}
            className={clsx(
              'inline-flex w-full items-center justify-center gap-2 bg-gradient-to-r from-[#2563FF] via-[#1B8FFF] to-[#4F8CFF] font-black text-white transition hover:brightness-105',
              userType === 'helper'
                ? 'min-h-[52px] rounded-2xl px-5 text-sm shadow-[0_12px_28px_rgba(37,99,255,0.28)]'
                : 'min-h-[62px] rounded-[1.75rem] px-6 text-base shadow-[0_18px_40px_rgba(37,99,255,0.32)]',
            )}
          >
            {isLastStep ? t('client_onboarding_tutorial.finish') : t('client_onboarding_tutorial.next')}
            {!isLastStep ? <ArrowRight className="h-5 w-5" /> : null}
          </button>

          {(step > 0 || onBackFromFirstStep) ? (
            <button
              type="button"
              onClick={goBack}
              className={clsx(
                'inline-flex min-h-[48px] w-full items-center justify-center gap-1 text-sm font-bold text-[#64748B] transition hover:text-[#0B1220]',
              )}
              data-testid="gamification-tutorial-back"
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
