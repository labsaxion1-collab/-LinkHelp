export const CLIENT_ELITE_LEVEL_VISUAL = {
  id: 'client-elite',
  accountType: 'client',
  level: 5,
  currentLevel: 'Cliente Elite',
  levelLabel: 'Nível 5',
  isMaxLevel: true,
  maxLevelMessage: 'Nível máximo alcançado',
  motionIntensity: 0.42,
  shockwaveDurationS: 16,
  shockwaveRingCount: 4,
  shockwaveDelays: ['0s', '4s', '8s', '12s'] as const,
  journeyEyebrow: 'O topo da jornada Link Help',
  headline: {
    beforeHighlight: 'Poucos chegam aqui. Você é',
    highlight: 'Elite.',
  },
  description:
    'Sua reputação é referência na comunidade. Cada pedido, cada avaliação e cada parceria consolidam um legado de excelência.',
  balanceLabel: 'Saldo disponível',
  medalAlt: 'Medalha Cliente Elite',
} as const;

export const CLIENT_ELITE_SPARKLES = [
  { left: '8%', top: '12%', size: 3, delay: '0s', duration: '3.8s' },
  { left: '88%', top: '15%', size: 2, delay: '1.4s', duration: '4.6s' },
  { left: '18%', top: '32%', size: 2, delay: '2.8s', duration: '4.2s' },
  { left: '76%', top: '36%', size: 3, delay: '0.5s', duration: '5.1s' },
  { left: '5%', top: '52%', size: 2, delay: '2.1s', duration: '4.4s' },
  { left: '92%', top: '50%', size: 2, delay: '3.6s', duration: '5.3s' },
  { left: '14%', top: '68%', size: 3, delay: '1s', duration: '4.9s' },
  { left: '80%', top: '65%', size: 2, delay: '3.2s', duration: '5.6s' },
  { left: '44%', top: '8%', size: 2, delay: '1.8s', duration: '4.1s' },
  { left: '52%', top: '74%', size: 3, delay: '0.7s', duration: '5s' },
  { left: '30%', top: '20%', size: 2, delay: '4.1s', duration: '4.3s' },
  { left: '66%', top: '22%', size: 2, delay: '1.2s', duration: '5.4s' },
  { left: '38%', top: '58%', size: 2, delay: '2.5s', duration: '4.7s' },
  { left: '58%', top: '60%', size: 2, delay: '3.9s', duration: '5.2s' },
  { left: '24%', top: '44%', size: 2, delay: '0.3s', duration: '4.5s' },
  { left: '72%', top: '48%', size: 2, delay: '2.9s', duration: '5.8s' },
] as const;

export const CLIENT_ELITE_ORBS = [
  { left: '22%', top: '28%', size: 14, delay: '0s', duration: '6.2s' },
  { left: '70%', top: '30%', size: 11, delay: '1.4s', duration: '5.8s' },
  { left: '15%', top: '55%', size: 10, delay: '2.6s', duration: '6.6s' },
  { left: '78%', top: '58%', size: 12, delay: '0.8s', duration: '5.4s' },
  { left: '48%', top: '18%', size: 9, delay: '3.2s', duration: '6s' },
  { left: '50%', top: '62%', size: 13, delay: '1.9s', duration: '5.6s' },
] as const;

export type ClientEliteLevelVisual = typeof CLIENT_ELITE_LEVEL_VISUAL;
