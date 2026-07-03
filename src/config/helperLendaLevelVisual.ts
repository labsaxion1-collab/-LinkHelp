export const HELPER_LENDA_LEVEL_VISUAL = {
  id: 'helper-lenda',
  accountType: 'helper',
  level: 6,
  currentLevel: 'Helper Lenda',
  levelLabel: 'Nivel 6',
  nextLevel: 'LENDA',
  progressPercent: 100,
  pointsRemaining: 0,
  motionIntensity: 0.42,
  journeyEyebrow: 'Seu nivel atual',
  headline: {
    beforeHighlight: 'Voce alcancou o',
    highlight: 'nivel maximo.',
  },
  description:
    'Poucos chegam ate aqui. Sua dedicacao, excelencia e impacto fazem de voce uma verdadeira referencia.',
  balanceLabel: 'Saldo disponivel',
  nextLevelLabel: 'Nivel maximo alcancado',
  medalAlt: 'Medalha Helper Lenda',
} as const;

export const HELPER_LENDA_SPARKLES = [
  { left: '8%', top: '13%', size: 4, delay: '0s', duration: '3.8s' },
  { left: '88%', top: '17%', size: 3, delay: '1.2s', duration: '4.6s' },
  { left: '18%', top: '34%', size: 3, delay: '2.8s', duration: '4.2s' },
  { left: '76%', top: '39%', size: 4, delay: '0.5s', duration: '5s' },
  { left: '6%', top: '58%', size: 3, delay: '2.1s', duration: '4s' },
  { left: '93%', top: '54%', size: 3, delay: '3.6s', duration: '4.8s' },
  { left: '15%', top: '75%', size: 4, delay: '0.9s', duration: '4.5s' },
  { left: '81%', top: '71%', size: 3, delay: '3.2s', duration: '5.2s' },
  { left: '46%', top: '9%', size: 3, delay: '1.7s', duration: '4.1s' },
  { left: '58%', top: '81%', size: 4, delay: '0.6s', duration: '4.7s' },
  { left: '32%', top: '21%', size: 3, delay: '4s', duration: '3.9s' },
  { left: '65%', top: '25%', size: 3, delay: '1.1s', duration: '4.9s' },
] as const;

export type HelperLendaLevelVisual = typeof HELPER_LENDA_LEVEL_VISUAL;
