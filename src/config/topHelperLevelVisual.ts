export const TOP_HELPER_LEVEL_VISUAL = {
  id: 'top-helper',
  accountType: 'helper',
  level: 5,
  currentLevel: 'Top Helper',
  levelLabel: 'Nivel 5',
  nextLevel: '6. Helper Lenda',
  progressPercent: 75,
  pointsRemaining: 420,
  motionIntensity: 0.5,
  journeyEyebrow: 'Seu nivel atual',
  headline: {
    beforeHighlight: 'Performance que',
    highlight: 'impulsiona resultados.',
  },
  description:
    'Voce esta entre os melhores. Seu compromisso, agilidade e qualidade fazem voce ir cada vez mais longe.',
  balanceLabel: 'Saldo disponivel',
  nextLevelLabel: 'Proximo nivel',
  medalAlt: 'Medalha Top Helper',
} as const;

export const TOP_HELPER_SPARKLES = [
  { left: '10%', top: '15%', size: 3, delay: '0s', duration: '4.4s' },
  { left: '86%', top: '18%', size: 2, delay: '1.6s', duration: '5.2s' },
  { left: '20%', top: '36%', size: 2, delay: '3.1s', duration: '4.8s' },
  { left: '73%', top: '41%', size: 3, delay: '0.7s', duration: '5.7s' },
  { left: '7%', top: '59%', size: 2, delay: '2.5s', duration: '4.5s' },
  { left: '91%', top: '56%', size: 2, delay: '4s', duration: '5.4s' },
  { left: '17%', top: '73%', size: 3, delay: '1.1s', duration: '5s' },
  { left: '78%', top: '69%', size: 2, delay: '3.6s', duration: '5.9s' },
  { left: '47%', top: '11%', size: 2, delay: '2s', duration: '4.7s' },
  { left: '56%', top: '79%', size: 3, delay: '0.8s', duration: '5.3s' },
  { left: '34%', top: '23%', size: 2, delay: '4.4s', duration: '4.4s' },
  { left: '63%', top: '27%', size: 2, delay: '1.4s', duration: '5.6s' },
] as const;

export type TopHelperLevelVisual = typeof TOP_HELPER_LEVEL_VISUAL;
