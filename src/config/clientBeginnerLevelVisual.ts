export const CLIENT_BEGINNER_LEVEL_VISUAL = {
  id: 'client-beginner',
  accountType: 'client',
  level: 1,
  currentLevel: 'Iniciante',
  levelLabel: 'Nível 1',
  nextLevel: '2. Cliente Confiável',
  progressPercent: 35,
  pointsRemaining: 130,
  journeyEyebrow: 'Sua jornada começa aqui',
  headline: {
    beforeHighlight: 'Toda grande jornada começa com o',
    highlight: 'primeiro passo.',
  },
  description:
    'Continue criando pedidos, concluindo serviços e construindo uma excelente reputação com os profissionais.',
  balanceLabel: 'Saldo disponível',
  nextLevelLabel: 'Próximo nível',
} as const;

export type ClientBeginnerLevelVisual = typeof CLIENT_BEGINNER_LEVEL_VISUAL;
