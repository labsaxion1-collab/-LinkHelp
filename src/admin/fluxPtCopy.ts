import type { ServiceCategoryId } from '@/data/serviceCategories';

/** Textos fixos em português — console FLUX / BackOffice (uso interno). */
export const FLUX_PT = {
  brandTagline: 'Infinitas possibilidades.',
  backToApp: 'Voltar ao aplicativo',
  signOut: 'Sair',
  appSwitcherLabel: 'Aplicativo',
  navOverview: 'Visão geral',
  navInsights: 'Insights de IA',
  navCategories: 'Inteligência por categoria',
  navAnalyticsLabel: 'Análises',
  navSettings: 'Configurações',
  multiAppHint: 'Mais apps FLUX em breve. Troque entre produtos sem sair do console.',
  liveMetrics: 'Métricas ao vivo',
  overviewTitle: 'Panorama LinkHelp',
  metricOpenRequests: 'Pedidos abertos',
  metricOpenDelta: 'Demanda ativa na plataforma',
  metricInProgress: 'Em andamento',
  metricPendingApps: 'Candidaturas pendentes',
  metricHireRate: 'Taxa de contratação',
  metricHiredCount: (count: number) => `${count} contratações`,
  marketPulseDemoLabel: 'Ilustrativo — não é dado ao vivo',
  marketPulseBody:
    'Demanda estável em mudanças e limpeza. Considere campanhas para categorias com baixa oferta de helpers.',
  aiInsightsTitle: 'Insights de IA',
  aiInsightsSub: 'Recomendações geradas a partir dos padrões da plataforma',
  aiInsightsDemoSub: 'Recomendações de exemplo apenas para pré-visualização do layout',
  insightTypeOpportunity: 'Oportunidade',
  insightTypeRisk: 'Risco',
  insightTypeTrend: 'Tendência',
  categoryIntelTitle: 'Inteligência por categoria',
  categoryIntelSub: 'Performance por categoria de serviço',
  colCategory: 'Categoria',
  colOpen: 'Abertos',
  colApplications: 'Candidaturas',
  colHireRate: 'Contratação',
  colAvgBudget: 'Orçamento médio',
  colTrend: 'Tendência',
  trendUp: '↑ Alta',
  trendDown: '↓ Baixa',
  trendFlat: '→ Estável',
  budgetNa: 'N/D',
  loadingMetrics: 'Carregando métricas administrativas…',
  emptyTitle: 'Ainda não há atividade na plataforma',
  emptyBody:
    'Pedidos, candidaturas e contratações estão zerados. Isso é normal após um reset — não é erro.',
  retry: 'Tentar novamente',
  clientLinkCreditsFlag:
    'CLIENT_LINKCREDITS_ENABLED=false — clientes não são cobrados ao abrir chamados.',
  financialLiveMetrics: 'Dados financeiros ao vivo',
  financialTitle: 'Visão financeira',
  financialSub: 'Compras Stripe confirmadas (CAD) e economia de LinkCredits',
  financialRangeToday: 'Hoje',
  financialRange7d: '7 dias',
  financialRange30d: '30 dias',
  financialRangeAll: 'Tudo',
  financialRevenueCad: 'Receita confirmada (CAD)',
  financialPurchaseStats: (count: number, avg: string) =>
    `${count} compras · média CAD $${avg}`,
  financialNoPurchases: 'Nenhuma compra confirmada neste período',
  financialLcSold: 'LinkCredits vendidos',
  financialLcConsumed: 'LinkCredits consumidos',
  financialLcRefunded: 'LinkCredits reembolsados',
  financialLcGranted: 'LinkCredits bonificados',
  financialLcGrantedHint: 'Bônus de cadastro, recompensas admin, promoções',
  financialLcCirculation: 'Créditos em circulação',
  financialNetBurn: 'Queima líquida de créditos',
  financialNetBurnHint: 'Consumidos menos reembolsados — economia de créditos, não lucro CAD',
  financialUnavailable: 'Métricas financeiras temporariamente indisponíveis.',
  loading: 'Carregando…',
  insight1Title: 'Pico em mudanças residenciais',
  insight1Body:
    'Pedidos de mudança subiram 18% na última semana. Ative helpers verificados na região de Montréal.',
  insight2Title: 'Conversão em limpeza',
  insight2Body: 'Limpeza residencial mantém a maior taxa de contratação entre categorias principais.',
  insight3Title: 'Baixa oferta em montagem',
  insight3Body: 'Pedidos abertos de montagem superam helpers ativos. Priorize recrutamento nesta categoria.',
} as const;

export const BACKOFFICE_PT = {
  sectionLabel: 'BackOffice',
  navOperationsLabel: 'Operações',
  navUsers: 'Usuários',
  navRequests: 'Chamados',
  navCredits: 'Créditos',
  navEconomy: 'Economia',
  navAudit: 'Auditoria',
  navSupport: 'Suporte',
  loading: 'Carregando…',
  empty: 'Nenhum registro encontrado.',
  usersTitle: 'Usuários',
  usersSubtitle: 'Lista somente leitura de clientes e helpers',
  userDetail: 'Detalhes do usuário',
  backToUsers: 'Voltar para usuários',
  usersTabAll: 'Todos',
  usersTabClient: 'Clientes',
  usersTabHelper: 'Helpers',
  searchUsersPlaceholder: 'Pesquisar usuários…',
  requestsTitle: 'Chamados',
  requestsSubtitle: 'Pedidos de serviço somente leitura',
  requestDetail: 'Detalhes do chamado',
  backToRequests: 'Voltar para chamados',
  searchRequestsPlaceholder: 'Pesquisar chamados…',
  creditsTitle: 'Transações LinkCredits',
  creditsSubtitle: 'Registro somente leitura — sem ajustes manuais no P0',
  economyTitle: 'Economia',
  economySubtitle: 'Snapshot somente leitura de pacotes e regras',
  economyReadonlyNote: 'Configurações editáveis ficam fora do escopo P0.',
  auditTitle: 'Logs de auditoria',
  auditSubtitle: 'Ações administrativas registradas',
  supportTitle: 'Suporte',
  supportSubtitle: 'Contexto somente leitura para atendimento — sem impersonação',
  supportReadonlyBanner:
    'Modo somente leitura. Impersonação e magic link não estão disponíveis no P0.',
  supportPickUser: 'Abra esta página a partir do detalhe de um usuário para carregar o contexto.',
  filterAllTypes: 'Todos os tipos',
  colName: 'Nome',
  colEmail: 'E-mail',
  colRole: 'Papel',
  colCity: 'Cidade',
  colPhone: 'Telefone',
  colBalance: 'Saldo LC',
  colTitle: 'Título',
  colStatus: 'Status',
  colClient: 'Cliente',
  colApps: 'Candidaturas',
  colCategory: 'Categoria',
  colBudget: 'Orçamento',
  colLocation: 'Local',
  colType: 'Tipo',
  colHelper: 'Helper',
  colAmount: 'Valor',
  colDate: 'Data',
  colAction: 'Ação',
  colTarget: 'Alvo',
  packagesSection: 'Pacotes Stripe',
  applyRulesSection: 'Regras de candidatura',
  normalApply: 'Candidatura normal',
  candidatesSection: 'Candidatos',
  walletSection: 'Carteira',
  profileSection: 'Perfil',
  recentTransactions: 'Transações recentes',
  recentRequests: 'Chamados recentes',
  openSupportView: 'Abrir visão de suporte',
  unavailable: 'BackOffice indisponível',
} as const;

const SERVICE_CATEGORY_LABELS_PT: Record<ServiceCategoryId, string> = {
  cleaning: 'Limpeza',
  sanitization: 'Higienização',
  moving: 'Mudanças e entregas',
  assembly: 'Montagem e instalação',
  automotive: 'Automotivo',
  translation: 'Tradução',
  beauty: 'Estética e beleza',
  renovation: 'Reforma e manutenção',
  outdoor: 'Jardinagem e Área Externa',
  pet: 'Pets',
  tech: 'Suporte em TI',
  design: 'Design',
  marketing: 'Marketing',
  other: 'Outros',
};

export function serviceCategoryLabelPt(id: string): string {
  return SERVICE_CATEGORY_LABELS_PT[id as ServiceCategoryId] ?? id;
}

export function formatBackofficeApiError(code: string): string {
  switch (code) {
    case 'UNAUTHORIZED':
      return 'Sessão expirada. Entre novamente.';
    case 'FORBIDDEN':
      return 'Esta conta não tem permissão para acessar o BackOffice.';
    case 'BACKOFFICE_NOT_CONFIGURED':
      return 'BackOffice ainda não está configurado no banco de dados.';
    case 'BACKOFFICE_RESOURCE_NOT_FOUND':
      return 'Recurso não encontrado.';
    default:
      if (code.startsWith('BACKOFFICE_')) return BACKOFFICE_PT.unavailable;
      return code;
  }
}

export const FINANCIAL_RANGE_LABEL_PT: Record<'today' | '7d' | '30d' | 'all', string> = {
  today: FLUX_PT.financialRangeToday,
  '7d': FLUX_PT.financialRange7d,
  '30d': FLUX_PT.financialRange30d,
  all: FLUX_PT.financialRangeAll,
};

export const INSIGHT_TYPE_LABEL_PT: Record<'opportunity' | 'risk' | 'trend', string> = {
  opportunity: FLUX_PT.insightTypeOpportunity,
  risk: FLUX_PT.insightTypeRisk,
  trend: FLUX_PT.insightTypeTrend,
};

export const USERS_ROLE_TAB_LABEL_PT: Record<'all' | 'client' | 'helper', string> = {
  all: BACKOFFICE_PT.usersTabAll,
  client: BACKOFFICE_PT.usersTabClient,
  helper: BACKOFFICE_PT.usersTabHelper,
};

/** Rótulos visíveis do status do app no seletor FLUX (valor interno permanece live/beta/planned). */
export const FLUX_APP_STATUS_LABEL_PT: Record<'live' | 'beta' | 'planned', string> = {
  live: 'Ativo',
  beta: 'Beta',
  planned: 'Planejado',
};

export function fluxAppStatusLabelPt(status: 'live' | 'beta' | 'planned'): string {
  return FLUX_APP_STATUS_LABEL_PT[status] ?? status;
}
