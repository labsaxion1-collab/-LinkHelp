export const HELPER_INICIANTE_LEVEL_VISUAL = {
  id: 'helper-iniciante',
  accountType: 'helper',
  level: 2,
  currentLevel: 'Helper Iniciante',
  levelLabel: 'Nivel 2',
  nextLevel: '3. Helper Profissional',
  progressPercent: 38,
  pointsRemaining: 260,
  motionIntensity: 0.58,
  journeyEyebrow: 'Seu talento comeca a ganhar destaque',
  headline: {
    beforeHighlight: 'Cada servico fortalece a sua',
    highlight: 'reputacao.',
  },
  description:
    'Continue realizando bons servicos, recebendo avaliacoes e conquistando a confianca de novos clientes.',
  balanceLabel: 'Saldo disponivel',
  nextLevelLabel: 'Proximo nivel',
  medalAlt: 'Medalha Helper Iniciante',
} as const;

export const HELPER_INICIANTE_SPARKLES = [
  { left: '11%', top: '14%', size: 3, delay: '0s', duration: '4.2s' },
  { left: '84%', top: '19%', size: 2, delay: '1.8s', duration: '5.1s' },
  { left: '22%', top: '38%', size: 2, delay: '3.2s', duration: '4.8s' },
  { left: '71%', top: '42%', size: 3, delay: '0.6s', duration: '5.6s' },
  { left: '8%', top: '58%', size: 2, delay: '2.4s', duration: '4.4s' },
  { left: '90%', top: '55%', size: 2, delay: '4.1s', duration: '5.3s' },
  { left: '18%', top: '72%', size: 3, delay: '1.2s', duration: '4.9s' },
  { left: '76%', top: '68%', size: 2, delay: '3.7s', duration: '5.8s' },
  { left: '48%', top: '12%', size: 2, delay: '2.1s', duration: '4.6s' },
  { left: '55%', top: '78%', size: 3, delay: '0.9s', duration: '5.2s' },
  { left: '35%', top: '24%', size: 2, delay: '4.5s', duration: '4.3s' },
  { left: '62%', top: '28%', size: 2, delay: '1.5s', duration: '5.5s' },
] as const;

export type HelperInicianteLevelVisual = typeof HELPER_INICIANTE_LEVEL_VISUAL;
