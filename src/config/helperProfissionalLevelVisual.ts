export const HELPER_PROFISSIONAL_LEVEL_VISUAL = {
  id: 'helper-profissional',
  accountType: 'helper',
  level: 3,
  currentLevel: 'Helper Profissional',
  levelLabel: 'Nivel 3',
  nextLevel: '4. Helper Elite',
  progressPercent: 35,
  pointsRemaining: 180,
  motionIntensity: 0.5,
  journeyEyebrow: 'Seu nivel atual',
  headline: {
    beforeHighlight: 'Seu trabalho ja',
    highlight: 'faz a diferenca.',
  },
  description:
    'Continue evoluindo, oferecendo excelentes servicos e conquistando cada vez mais clientes.',
  balanceLabel: 'Saldo disponivel',
  nextLevelLabel: 'Proximo nivel',
  medalAlt: 'Medalha Helper Profissional',
} as const;

export const HELPER_PROFISSIONAL_SPARKLES = [
  { left: '10%', top: '15%', size: 3, delay: '0s', duration: '4.5s' },
  { left: '86%', top: '18%', size: 2, delay: '1.6s', duration: '5.3s' },
  { left: '20%', top: '36%', size: 2, delay: '3.1s', duration: '4.9s' },
  { left: '73%', top: '41%', size: 3, delay: '0.7s', duration: '5.8s' },
  { left: '7%', top: '59%', size: 2, delay: '2.5s', duration: '4.6s' },
  { left: '91%', top: '56%', size: 2, delay: '4s', duration: '5.5s' },
  { left: '17%', top: '73%', size: 3, delay: '1.1s', duration: '5.1s' },
  { left: '78%', top: '69%', size: 2, delay: '3.6s', duration: '6s' },
  { left: '47%', top: '11%', size: 2, delay: '2s', duration: '4.8s' },
  { left: '56%', top: '79%', size: 3, delay: '0.8s', duration: '5.4s' },
  { left: '34%', top: '23%', size: 2, delay: '4.4s', duration: '4.5s' },
  { left: '63%', top: '27%', size: 2, delay: '1.4s', duration: '5.7s' },
] as const;

export type HelperProfissionalLevelVisual = typeof HELPER_PROFISSIONAL_LEVEL_VISUAL;
