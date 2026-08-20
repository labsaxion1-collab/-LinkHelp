import type { UserType } from '@/gamification/types/gamification';

export interface GamificationTutorialCard {
  id: string;
  title: string;
  body: string;
  /** Medalha exibida no card (chave do MEDAL_MAP); sem heroKey usa ícone genérico. */
  heroKey?: string;
  requirements?: string[];
  currentLevelName?: string;
  nextLevelName?: string;
  nextHeroKey?: string;
  benefit?: string;
  isCurrentProgress?: boolean;
  statusCopy?: string;
  isMaxLevel?: boolean;
  exclusiveBenefits?: Array<{ title: string; body: string }>;
  maintenanceTips?: string[];
  recognitionCopy?: string;
  isLevelSummary?: boolean;
  summaryUserType?: UserType;
}

const HELPER_TUTORIAL_CARDS: GamificationTutorialCard[] = [
  {
    id: 'helper-novo-iniciante',
    title: 'Como virar Helper Iniciante?',
    body: 'Dê os primeiros passos na plataforma e comece a construir sua reputação. A progressão é sequencial: uma medalha por vez.',
    heroKey: 'helper_novo',
    nextHeroKey: 'helper_confiavel',
    currentLevelName: 'Novo Helper',
    nextLevelName: 'Helper Iniciante',
    statusCopy: 'Sua jornada profissional começa aqui!',
    requirements: ['Alcançar 100 pontos', 'Completar pelo menos 80% do perfil', 'Enviar sua primeira candidatura'],
    benefit: 'Mais credibilidade, evolução da medalha e progresso para novos benefícios.',
    isCurrentProgress: true,
  },
  {
    id: 'profissional',
    title: 'Como virar Profissional?',
    body: 'Continue evoluindo com serviços de qualidade, nota mínima 4,5 e taxa de resposta de pelo menos 70%.',
    heroKey: 'helper_confiavel',
    nextHeroKey: 'helper_profissional',
    currentLevelName: 'Helper Iniciante',
    nextLevelName: 'Profissional',
    statusCopy: 'Você já deu os primeiros passos na LinkHelp!',
    requirements: ['Alcançar 250 pontos', 'Concluir 3 serviços', 'Manter nota mínima 4,5', 'Manter taxa de resposta de 70%'],
    benefit: 'Mais reconhecimento e credibilidade para conquistar novas oportunidades.',
    isCurrentProgress: true,
  },
  {
    id: 'helper-profissional-elite',
    title: 'Como virar Elite?',
    body: 'Fortaleça seu histórico e mantenha um padrão elevado de atendimento.',
    heroKey: 'helper_profissional',
    nextHeroKey: 'helper_elite',
    currentLevelName: 'Profissional',
    nextLevelName: 'Elite',
    statusCopy: 'Sua experiência profissional está crescendo!',
    requirements: ['Alcançar 500 pontos', 'Concluir 10 serviços', 'Manter nota mínima 4,7', 'Manter taxa de resposta de 80%', 'Ter no máximo 2 reclamações confirmadas'],
    benefit: 'Seu perfil comunica ainda mais confiança e excelência.',
    isCurrentProgress: true,
  },
  {
    id: 'helper-elite-top',
    title: 'Como virar Top Helper?',
    body: 'Destaque-se entre os profissionais mais consistentes da plataforma.',
    heroKey: 'helper_elite',
    nextHeroKey: 'helper_top_helper',
    currentLevelName: 'Elite',
    nextLevelName: 'Top Helper',
    statusCopy: 'Você já conquistou uma reputação de alto nível!',
    requirements: ['Alcançar 750 pontos', 'Concluir 25 serviços', 'Manter nota mínima 4,8', 'Manter taxa de resposta de 90%', 'Manter taxa de contratação de 30%'],
    benefit: 'Mais destaque e reconhecimento entre os melhores helpers.',
    isCurrentProgress: true,
  },
  {
    id: 'lenda',
    title: 'Como virar Lenda LinkHelp?',
    body: 'Chegue ao nível máximo com excelência, consistência, taxa de resposta de 90% e zero reclamações confirmadas.',
    heroKey: 'helper_top_helper',
    nextHeroKey: 'helper_lenda',
    currentLevelName: 'Top Helper',
    nextLevelName: 'Lenda LinkHelp',
    statusCopy: 'Você está entre os grandes destaques da LinkHelp!',
    requirements: ['Alcançar 900 pontos', 'Concluir 50 serviços', 'Manter nota mínima 4,9', 'Manter taxa de resposta de 90%', 'Ter zero reclamações confirmadas'],
    benefit: 'Credibilidade máxima e reconhecimento como referência profissional.',
    isCurrentProgress: true,
  },
  {
    id: 'helper-lenda-max',
    title: 'Lenda LinkHelp',
    body: 'Você alcançou o topo da jornada profissional!',
    heroKey: 'helper_lenda',
    currentLevelName: 'Lenda LinkHelp',
    statusCopy: 'Você é referência entre os helpers da plataforma.',
    isMaxLevel: true,
    exclusiveBenefits: [
      { title: 'Credibilidade máxima', body: 'Clientes reconhecem seu histórico e sua excelência.' },
      { title: 'Evolução completa', body: 'Sua medalha representa o maior nível da jornada.' },
      { title: 'Destaque profissional', body: 'Seu perfil comunica experiência e confiança.' },
      { title: 'Reconhecimento LinkHelp', body: 'Você se torna uma referência na comunidade.' },
    ],
    maintenanceTips: ['Continue concluindo serviços com qualidade', 'Responda rapidamente às mensagens', 'Mantenha avaliações excelentes', 'Evite cancelamentos e reclamações', 'Mantenha seu perfil sempre atualizado'],
    recognitionCopy: 'Sua responsabilidade e a qualidade do seu trabalho fortalecem toda a comunidade LinkHelp.',
  },
  {
    id: 'helper-level-summary',
    title: 'Parabéns! Você chegou ao final',
    body: 'Conheça todos os níveis do helper e o reconhecimento conquistado em cada etapa.',
    isLevelSummary: true,
    summaryUserType: 'helper',
  },
];

const CLIENT_TUTORIAL_CARDS: GamificationTutorialCard[] = [
  {
    id: 'reputation',
    title: 'Sua reputação importa',
    body: 'Sua medalha mostra aos helpers que você é um cliente confiável. A progressão é sequencial — um nível de cada vez.',
    heroKey: 'client_novo',
  },
  {
    id: 'points',
    title: 'Como ganho pontos?',
    body: 'Pontos vêm de perfil completo, pedidos publicados, serviços concluídos, boas avaliações, taxa de resposta no chat e poucos cancelamentos.',
  },
  {
    id: 'confiavel_ouro',
    title: 'Confiável e Cliente Ouro',
    body: 'Confiável: score 100+, perfil 80%+ e 1 pedido publicado. Ouro: score 250+, 3 serviços concluídos com nota 4,5+ e poucos cancelamentos.',
    heroKey: 'client_ouro',
  },
  {
    id: 'vip',
    title: 'Como viro Cliente VIP?',
    body: 'Após Ouro: score 500+, 10+ serviços concluídos, nota 4,7+ e taxa de resposta de pelo menos 70% no chat.',
    heroKey: 'client_vip',
  },
  {
    id: 'elite',
    title: 'Como viro Cliente Elite?',
    body: 'Após VIP: score 750+, 25+ serviços, nota 4,9+, taxa de resposta de pelo menos 80%, no máximo 1 cancelamento e zero reclamações confirmadas.',
    heroKey: 'client_elite',
  },
];

export function getGamificationTutorialCards(userType: UserType): GamificationTutorialCard[] {
  return userType === 'helper' ? HELPER_TUTORIAL_CARDS : CLIENT_TUTORIAL_CARDS;
}

/** Opens the carousel at the slide that matches the user's current level. */
export function getTutorialInitialCardIdForLevel(userType: UserType, levelKey: string): string {
  if (userType === 'helper') {
    const map: Record<string, string> = {
      novo: 'helper-novo-iniciante',
      confiavel: 'profissional',
      profissional: 'helper-profissional-elite',
      elite: 'helper-elite-top',
      top_helper: 'lenda',
      lenda: 'helper-lenda-max',
    };
    return map[levelKey] ?? 'helper-novo-iniciante';
  }
  const clientMap: Record<string, string> = {
    novo: 'reputation',
    confiavel: 'confiavel_ouro',
    ouro: 'vip',
    vip: 'elite',
    elite: 'elite',
  };
  return clientMap[levelKey] ?? 'reputation';
}

export const GAMIFICATION_TUTORIAL_TITLE = 'Como subir de nível?';
