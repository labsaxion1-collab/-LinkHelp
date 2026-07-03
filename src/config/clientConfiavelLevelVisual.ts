export const CLIENT_CONFIAVEL_LEVEL_VISUAL = {
  id: 'client-confiavel',
  accountType: 'client',
  level: 2,
  currentLevel: 'Cliente Confiável',
  levelLabel: 'Nível 2',
  nextLevel: '3. Cliente Ouro',
  progressPercent: 35,
  pointsRemaining: 280,
  motionIntensity: 0.58,
  halo: {
    top: '30%',
    width: '90%',
  },
  journeyEyebrow: 'Sua reputação já fala por você',
  headline: {
    beforeHighlight: 'A confiança é a base de toda grande',
    highlight: 'parceria.',
  },
  description:
    'Continue criando pedidos e avaliando os helpers. Sua consistência está construindo uma reputação sólida.',
  balanceLabel: 'Saldo disponível',
  nextLevelLabel: 'Próximo nível',
  medalAlt: 'Medalha Cliente Confiável',
} as const;

export const CLIENT_CONFIAVEL_SPARKLES = [
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

export type ClientConfiavelLevelVisual = typeof CLIENT_CONFIAVEL_LEVEL_VISUAL;
