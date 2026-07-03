export const CLIENT_VIP_LEVEL_VISUAL = {
  id: 'client-vip',
  accountType: 'client',
  level: 4,
  currentLevel: 'Cliente VIP',
  levelLabel: 'Nível 4',
  nextLevel: '5. Cliente Elite',
  progressPercent: 58,
  pointsRemaining: 620,
  motionIntensity: 0.5,
  halo: {
    top: '30%',
    width: '90%',
  },
  journeyEyebrow: 'Poucos chegam a este patamar',
  headline: {
    beforeHighlight: 'Um status reservado para quem constrói',
    highlight: 'excelência.',
  },
  description:
    'Sua reputação ultrapassou o comum. Continue criando experiências memoráveis e inspire confiança em cada pedido.',
  balanceLabel: 'Saldo disponível',
  nextLevelLabel: 'Próximo nível',
  medalAlt: 'Medalha Cliente VIP',
} as const;

export const CLIENT_VIP_SPARKLES = [
  { left: '12%', top: '13%', size: 3, delay: '0.2s', duration: '4.4s' },
  { left: '85%', top: '17%', size: 2, delay: '1.9s', duration: '5.2s' },
  { left: '21%', top: '37%', size: 2, delay: '3.3s', duration: '4.7s' },
  { left: '72%', top: '43%', size: 3, delay: '0.5s', duration: '5.7s' },
  { left: '9%', top: '57%', size: 2, delay: '2.6s', duration: '4.5s' },
  { left: '89%', top: '54%', size: 2, delay: '4.2s', duration: '5.4s' },
  { left: '19%', top: '71%', size: 3, delay: '1.3s', duration: '5s' },
  { left: '77%', top: '67%', size: 2, delay: '3.8s', duration: '5.9s' },
  { left: '49%', top: '11%', size: 2, delay: '2.2s', duration: '4.6s' },
  { left: '54%', top: '77%', size: 3, delay: '1s', duration: '5.3s' },
  { left: '36%', top: '25%', size: 2, delay: '4.6s', duration: '4.4s' },
  { left: '64%', top: '29%', size: 2, delay: '1.6s', duration: '5.6s' },
] as const;

export type ClientVipLevelVisual = typeof CLIENT_VIP_LEVEL_VISUAL;
