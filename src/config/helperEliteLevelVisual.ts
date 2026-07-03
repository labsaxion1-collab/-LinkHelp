export const HELPER_ELITE_LEVEL_VISUAL = {
  id: 'helper-elite',
  accountType: 'helper',
  level: 4,
  currentLevel: 'Helper Elite',
  levelLabel: 'Nivel 4',
  nextLevel: '5. Top Helper',
  progressPercent: 75,
  pointsRemaining: 420,
  motionIntensity: 0.48,
  journeyEyebrow: 'Seu nivel atual',
  headline: {
    beforeHighlight: 'Excelencia que inspira',
    highlight: 'confianca e resultados.',
  },
  description:
    'Voce e referencia na plataforma. Continue entregando experiencias excepcionais e alcancando novos patamares.',
  balanceLabel: 'Saldo disponivel',
  nextLevelLabel: 'Proximo nivel',
  medalAlt: 'Medalha Helper Elite',
} as const;

export const HELPER_ELITE_SPARKLES = [
  { left: '10%', top: '15%', size: 3, delay: '0s', duration: '4.6s' },
  { left: '86%', top: '18%', size: 2, delay: '1.6s', duration: '5.4s' },
  { left: '20%', top: '36%', size: 2, delay: '3.1s', duration: '5s' },
  { left: '73%', top: '41%', size: 3, delay: '0.7s', duration: '5.9s' },
  { left: '7%', top: '59%', size: 2, delay: '2.5s', duration: '4.7s' },
  { left: '91%', top: '56%', size: 2, delay: '4s', duration: '5.6s' },
  { left: '17%', top: '73%', size: 3, delay: '1.1s', duration: '5.2s' },
  { left: '78%', top: '69%', size: 2, delay: '3.6s', duration: '6.1s' },
  { left: '47%', top: '11%', size: 2, delay: '2s', duration: '4.9s' },
  { left: '56%', top: '79%', size: 3, delay: '0.8s', duration: '5.5s' },
  { left: '34%', top: '23%', size: 2, delay: '4.4s', duration: '4.6s' },
  { left: '63%', top: '27%', size: 2, delay: '1.4s', duration: '5.8s' },
] as const;

export type HelperEliteLevelVisual = typeof HELPER_ELITE_LEVEL_VISUAL;
