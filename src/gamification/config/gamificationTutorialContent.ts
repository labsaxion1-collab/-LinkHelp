import type { UserType } from '@/gamification/types/gamification';

export interface GamificationTutorialCard {
  id: string;
  title: string;
  body: string;
  /** Medalha exibida no card (chave do MEDAL_MAP); sem heroKey usa ícone genérico. */
  heroKey?: string;
}

const HELPER_TUTORIAL_CARDS: GamificationTutorialCard[] = [
  {
    id: 'medals',
    title: 'O que são medalhas?',
    body: 'As medalhas mostram sua evolução como helper na LinkHelp.',
    heroKey: 'helper_novo',
  },
  {
    id: 'points',
    title: 'Como ganho pontos?',
    body: 'Você ganha pontos concluindo serviços, recebendo boas avaliações, respondendo rápido e mantendo seu perfil completo.',
  },
  {
    id: 'confiavel',
    title: 'Como subo para Confiável?',
    body: 'Complete seu perfil, envie sua primeira candidatura e mantenha suas informações atualizadas.',
    heroKey: 'helper_confiavel',
  },
  {
    id: 'profissional_elite',
    title: 'Como viro Profissional ou Elite?',
    body: 'Conclua serviços, mantenha boas avaliações e responda rapidamente aos clientes.',
    heroKey: 'helper_elite',
  },
  {
    id: 'top_helper',
    title: 'Como chego a Top Helper?',
    body: 'Top Helper é para quem entrega muitos serviços, mantém ótima reputação e é escolhido com frequência.',
    heroKey: 'helper_top_helper',
  },
  {
    id: 'lenda',
    title: 'Como viro Lenda LinkHelp?',
    body: 'Lenda é o nível máximo: excelência, confiança e consistência no atendimento.',
    heroKey: 'helper_lenda',
  },
];

const CLIENT_TUTORIAL_CARDS: GamificationTutorialCard[] = [
  {
    id: 'reputation',
    title: 'Sua reputação importa',
    body: 'Sua medalha mostra aos helpers que você é um cliente confiável.',
    heroKey: 'client_novo',
  },
  {
    id: 'points',
    title: 'Como ganho pontos?',
    body: 'Você ganha pontos publicando pedidos, concluindo serviços, respondendo bem e mantendo seu perfil completo.',
  },
  {
    id: 'level_up',
    title: 'Como subo de nível?',
    body: 'Cada nível exige score mínimo e boas práticas dentro da plataforma.',
    heroKey: 'client_ouro',
  },
  {
    id: 'improve',
    title: 'Como melhorar minha reputação?',
    body: 'Responda os helpers, evite cancelamentos e finalize os serviços corretamente.',
    heroKey: 'client_vip',
  },
  {
    id: 'elite',
    title: 'Como viro Cliente Elite?',
    body: 'Cliente Elite representa quem usa a LinkHelp com responsabilidade e mantém excelente relacionamento com os profissionais.',
    heroKey: 'client_elite',
  },
];

export function getGamificationTutorialCards(userType: UserType): GamificationTutorialCard[] {
  return userType === 'helper' ? HELPER_TUTORIAL_CARDS : CLIENT_TUTORIAL_CARDS;
}

export const GAMIFICATION_TUTORIAL_TITLE = 'Como subir de nível?';
