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
}

const HELPER_TUTORIAL_CARDS: GamificationTutorialCard[] = [
  {
    id: 'medals',
    title: 'O que são medalhas?',
    body: 'Cada nível tem uma medalha e uma hero exclusiva. A progressão é sequencial — você sobe um degrau por vez, sem pular etapas.',
    heroKey: 'helper_novo',
  },
  {
    id: 'points',
    title: 'Como ganho pontos?',
    body: 'Pontos vêm de perfil completo, candidaturas, serviços concluídos, boas avaliações, taxa de resposta no chat e poucos cancelamentos ou reclamações confirmadas.',
  },
  {
    id: 'confiavel',
    title: 'Como subo para Confiável?',
    body: 'Alcance score 100+, complete pelo menos 80% do perfil e envie sua primeira candidatura.',
    heroKey: 'helper_confiavel',
  },
  {
    id: 'profissional',
    title: 'Como viro Profissional?',
    body: 'Após Confiável: score 250+, conclua 3 serviços com nota mínima 4,5 e mantenha taxa de resposta de pelo menos 70% no chat.',
    heroKey: 'helper_profissional',
  },
  {
    id: 'elite_top',
    title: 'Elite e Top Helper',
    body: 'Elite exige 10+ serviços, nota 4,7+ e resposta 80%+. Top Helper exige 25+ serviços, nota 4,8+, resposta 90%+ e boa taxa de contratação.',
    heroKey: 'helper_top_helper',
  },
  {
    id: 'lenda',
    title: 'Como viro Lenda LinkHelp?',
    body: 'O nível máximo exige 50+ serviços, nota 4,9+, resposta 90%+ e zero reclamações confirmadas contra você.',
    heroKey: 'helper_lenda',
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

export const GAMIFICATION_TUTORIAL_TITLE = 'Como subir de nível?';
