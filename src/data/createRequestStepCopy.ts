/**
 * Dynamic copy for the create-request description step: chips, placeholder, tags, optional example line.
 * `categorySuggestionsRegistry` exposes the EN tree for tooling / future CMS.
 */
import { SERVICE_CATEGORIES, type ServiceCategoryId } from '@/data/serviceCategories';

export type RequestDescriptionCopy = {
  suggestions: string[];
  placeholder: string;
  tags: string[];
  /** Short “full sentence” hint — user can tap to fill */
  exampleHint?: string;
};

type Lang = 'en' | 'pt' | 'fr';
type Tree = Partial<Record<ServiceCategoryId, Record<string, RequestDescriptionCopy>>>;

function catKeys(id: ServiceCategoryId): readonly string[] {
  return SERVICE_CATEGORIES.find((c) => c.id === id)!.subKeys as readonly string[];
}

function uniform(subKeys: readonly string[], block: RequestDescriptionCopy): Record<string, RequestDescriptionCopy> {
  return Object.fromEntries(subKeys.map((k) => [k, block])) as Record<string, RequestDescriptionCopy>;
}

const DATA: Record<Lang, Tree> = {
  en: {
    cleaning: {
      apartment: {
        suggestions: [
          'Apartment cleaning (2 BR)',
          'Deep clean before hosting',
          'Weekly apartment maintenance',
          'Kitchen + bathrooms only',
        ],
        placeholder: 'e.g. Deep clean for a 2-bedroom apartment.',
        tags: ['cleaning', 'apartment', 'residential'],
        exampleHint: 'I need a deep clean for a 2-bedroom apartment.',
      },
      house: {
        suggestions: ['Whole-house cleaning', 'Main floor only', 'Basement tidy-up', 'Before family visit'],
        placeholder: 'e.g. Standard house cleaning this weekend.',
        tags: ['cleaning', 'house', 'home'],
        exampleHint: 'I need standard cleaning for a small house.',
      },
      commercial: {
        suggestions: ['Small office / studio', 'Retail storefront windows', 'After-hours janitorial', 'Monthly contract'],
        placeholder: 'e.g. Commercial space cleaning after business hours.',
        tags: ['cleaning', 'commercial', 'office'],
        exampleHint: 'We need light cleaning for a small office weekly.',
      },
      post_construction: {
        suggestions: ['Post-renovation dust', 'Fine dust after drywall', 'Before furniture delivery', 'Urgent builders’ clean'],
        placeholder: 'e.g. Post-construction cleaning in my apartment.',
        tags: ['cleaning', 'post-construction', 'dust'],
        exampleHint: 'I need post-construction cleaning in a small apartment.',
      },
      moving_clean: {
        suggestions: ['Move-out for inspection', 'Empty rental — floors', 'After small move', 'Landlord checklist'],
        placeholder: 'e.g. Move-out cleaning before handover Monday.',
        tags: ['cleaning', 'move-out', 'rental'],
        exampleHint: 'Move-out clean for a 3½ apartment.',
      },
      windows: {
        suggestions: ['Interior + exterior (low floor)', 'Balcony glass panels', 'Hard-water spots', 'Sliding doors'],
        placeholder: 'e.g. Window cleaning for a condo.',
        tags: ['cleaning', 'windows', 'glass'],
        exampleHint: 'Interior window cleaning for a 2-bedroom condo.',
      },
      deep: {
        suggestions: ['Inside fridge & oven', 'Baseboards & doors', 'Sanitize bathrooms', 'Spring deep clean'],
        placeholder: 'e.g. Deep clean kitchen and two bathrooms.',
        tags: ['cleaning', 'deep', 'sanitize'],
        exampleHint: 'I need deep cleaning for kitchen and bathrooms.',
      },
    },
    sanitization: {
      sofa: {
        suggestions: ['Sectional sofa', 'Pet stains', 'Odor removal', 'Fabric protection'],
        placeholder: 'e.g. Deep clean fabric sofa in living room.',
        tags: ['sanitization', 'sofa', 'upholstery'],
        exampleHint: 'Need professional sofa cleaning with stain treatment.',
      },
      mattress: {
        suggestions: ['Queen mattress', 'Allergen treatment', 'Move-out refresh', 'Kids room'],
        placeholder: 'e.g. Sanitize double mattress after move-in.',
        tags: ['sanitization', 'mattress'],
        exampleHint: 'Mattress deep clean and odor removal.',
      },
      car: {
        suggestions: ['Interior detail', 'Seats & carpet', 'Pet hair removal', 'Odor neutralizer'],
        placeholder: 'e.g. Full interior car sanitization.',
        tags: ['sanitization', 'car', 'auto'],
        exampleHint: 'Car interior deep clean and sanitization.',
      },
      carpet: {
        suggestions: ['Living room rug', 'Stairs carpet', 'High-traffic areas', 'Stain spots'],
        placeholder: 'e.g. Carpet cleaning for 2 rooms.',
        tags: ['sanitization', 'carpet', 'rug'],
        exampleHint: 'Professional carpet cleaning with stain treatment.',
      },
    },
    moving: uniform(catKeys('moving'), {
      suggestions: [
        'Local move this month',
        'Need truck + movers',
        'Packing + boxes',
        'Fragile items / appliances',
      ],
      placeholder: 'e.g. Describe both addresses, volume, and access (elevator, stairs).',
      tags: ['moving', 'relocation'],
      exampleHint: 'I need to move from a 3rd-floor apartment to a house — elevator at pickup.',
    }),
    translation: {
      government: {
        suggestions: ['Government forms', 'Service Canada visit', 'CRA letter', 'Official correspondence'],
        placeholder: 'e.g. Help translating a government document to English.',
        tags: ['translation', 'government', 'official'],
        exampleHint: 'I need documents translated for immigration.',
      },
      school: {
        suggestions: ['School report card', 'Teacher notes', 'Permission slips', 'Report summaries'],
        placeholder: 'e.g. Translate school documents for registration.',
        tags: ['translation', 'school', 'family'],
        exampleHint: 'Translate school documents from French to English.',
      },
      college: {
        suggestions: ['Course syllabus', 'Assignment brief', 'Academic transcript', 'Scholarship letter'],
        placeholder: 'e.g. Translate university paperwork.',
        tags: ['translation', 'college', 'academic'],
        exampleHint: 'EN → FR translation for college paperwork.',
      },
      interview: {
        suggestions: ['Job interview practice', 'Mock Q&A in English', 'Salary negotiation phrases', 'Follow-up email'],
        placeholder: 'e.g. Practice interview in English for Friday.',
        tags: ['translation', 'interview', 'coaching'],
        exampleHint: 'Help me prepare for a job interview in English.',
      },
      document: {
        suggestions: ['Lease translation', 'Bank letter', 'Medical summary', 'Work contract'],
        placeholder: 'e.g. Translate personal documents to French.',
        tags: ['translation', 'documents', 'certified-style'],
        exampleHint: 'I need to translate documents into French.',
      },
      consultation: {
        suggestions: ['Clinic intake form', 'Consent forms', 'Instructions after visit', 'Appointment letter'],
        placeholder: 'e.g. Translate a medical consultation letter.',
        tags: ['translation', 'medical', 'consultation'],
        exampleHint: 'Translate consultation notes for my doctor visit.',
      },
      immigration: {
        suggestions: ['Immigration package', 'Proof of funds letter', 'Reference letters', 'Timeline summary'],
        placeholder: 'e.g. Immigration document translation EN ↔ FR.',
        tags: ['translation', 'immigration', 'official'],
        exampleHint: 'Translation for immigration — French to English.',
      },
    },
    automotive: uniform(catKeys('automotive'), {
      suggestions: ['Tire change', 'Dead battery', 'Jump-start / booster', "Car won't start"],
      placeholder: 'e.g. My car won’t start in the parking garage.',
      tags: ['automotive', 'roadside', 'urgent'],
      exampleHint: 'Battery dead — need a boost downtown.',
    }),
    assembly: uniform(catKeys('assembly'), {
      suggestions: [
        'IKEA wardrobe',
        'Bed / frame',
        'Desk / office table',
        'TV wall mount',
        'Curtains / rods',
        'Wall shelf / bracket',
      ],
      placeholder: 'e.g. Assemble IKEA furniture tomorrow afternoon.',
      tags: ['assembly', 'furniture', 'mounting'],
      exampleHint: 'I need IKEA PAX wardrobe assembly this weekend.',
    }),
    beauty: uniform(catKeys('beauty'), {
      suggestions: [
        'Nails',
        'Nail extensions',
        'Barber',
        'Hairdresser',
        'Body massage',
        'Facial cleansing',
        'Brows',
        'Waxing',
        'Lash designer',
      ],
      placeholder: 'e.g. Nail appointment at home Saturday morning.',
      tags: ['beauty', 'home-service', 'self-care'],
      exampleHint: 'Nail extensions and brow shaping at my place.',
    }),
    renovation: uniform(catKeys('renovation'), {
      suggestions: [
        'Plumbing / leak',
        'Shower / faucet',
        'Interior painting',
        'Roof patch / inspection',
        'Drywall repair',
        'Small handyman fixes',
      ],
      placeholder: 'e.g. Fix a leaking pipe under the kitchen sink.',
      tags: ['renovation', 'repairs', 'home'],
      exampleHint: 'Small plumbing repair and patch drywall.',
    }),
    outdoor: uniform(catKeys('outdoor'), {
      suggestions: ['Snow removal', 'Garden tidy', 'Fence repair', 'Exterior wash', 'Pool cleaning'],
      placeholder: 'e.g. Snow removal for driveway and walkway.',
      tags: ['outdoor', 'yard', 'seasonal'],
      exampleHint: 'I need help with my outdoor area.',
    }),
    other: uniform(catKeys('other'), {
      suggestions: ['Describe the task', 'Share location details', 'Mention timing and access'],
      placeholder: 'e.g. Describe the help you need.',
      tags: ['other', 'help', 'local'],
      exampleHint: 'I need help with a task that does not fit the listed categories.',
    }),
    pet: uniform(catKeys('pet'), {
      suggestions: ['Dog walking', 'Bath / groom', 'Pet sitter'],
      placeholder: 'e.g. Walk my dog twice this week.',
      tags: ['pets', 'dog', 'care'],
      exampleHint: 'I need pet care help.',
    }),
    tech: uniform(catKeys('tech'), {
      suggestions: ['PC format / reinstall', 'Wi-Fi dead zones', 'Software install', 'Smart TV setup', 'Phone backup'],
      placeholder: 'e.g. Wi-Fi is slow on the second floor.',
      tags: ['tech', 'wifi', 'support'],
      exampleHint: 'I need help setting up Wi-Fi and my smart TV.',
    }),
    design: {
      logo_brand: {
        suggestions: ['Logo for small business', 'Brand refresh', 'Business card + logo', 'Startup identity kit'],
        placeholder: 'e.g. I need a logo and basic brand colors for my café.',
        tags: ['design', 'logo', 'branding'],
        exampleHint: 'I need a simple logo and brand identity for a local shop.',
      },
      social_media: {
        suggestions: ['Instagram post pack', 'Story templates', 'Carousel for promo', 'Feed refresh'],
        placeholder: 'e.g. Create 5 social posts for a product launch.',
        tags: ['design', 'social', 'graphics'],
        exampleHint: 'I need social media graphics for this month.',
      },
      ui_ux: {
        suggestions: ['Landing page layout', 'App screen mockups', 'Wireframes', 'Design system basics'],
        placeholder: 'e.g. Design a simple landing page for my service.',
        tags: ['design', 'ui', 'ux'],
        exampleHint: 'I need UI mockups for a small mobile app.',
      },
      print: {
        suggestions: ['Flyer for event', 'Menu design', 'Poster', 'Brochure'],
        placeholder: 'e.g. Flyer for a weekend promotion.',
        tags: ['design', 'print', 'flyer'],
        exampleHint: 'I need a printable flyer for a local event.',
      },
      presentation: {
        suggestions: ['Pitch deck', 'Sales slides', 'Training deck', 'Investor presentation'],
        placeholder: 'e.g. Polish a 10-slide pitch deck.',
        tags: ['design', 'slides', 'presentation'],
        exampleHint: 'I need help designing a short pitch presentation.',
      },
      photo_editing: {
        suggestions: ['Product photos', 'Background removal', 'Color correction', 'Batch edits'],
        placeholder: 'e.g. Edit product photos for my online store.',
        tags: ['design', 'photo', 'editing'],
        exampleHint: 'I need product photos cleaned up for my shop.',
      },
    },
    marketing: {
      social_media: {
        suggestions: ['Monthly content plan', 'Post scheduling', 'Community management', 'Hashtag strategy'],
        placeholder: 'e.g. Manage Instagram for a local salon.',
        tags: ['marketing', 'social', 'content'],
        exampleHint: 'I need help managing social media for my business.',
      },
      seo: {
        suggestions: ['Google Business profile', 'Local SEO audit', 'Keyword research', 'On-page fixes'],
        placeholder: 'e.g. Improve local search visibility for my store.',
        tags: ['marketing', 'seo', 'google'],
        exampleHint: 'I want to rank better on Google locally.',
      },
      paid_ads: {
        suggestions: ['Meta ads setup', 'Google Ads campaign', 'Retargeting', 'Ad creative review'],
        placeholder: 'e.g. Launch a small Google Ads campaign.',
        tags: ['marketing', 'ads', 'paid'],
        exampleHint: 'I need help setting up paid ads with a small budget.',
      },
      content: {
        suggestions: ['Blog articles', 'Newsletter copy', 'Product descriptions', 'Video scripts'],
        placeholder: 'e.g. Write 3 blog posts for my website.',
        tags: ['marketing', 'content', 'copy'],
        exampleHint: 'I need marketing copy for my website and social.',
      },
      email: {
        suggestions: ['Welcome sequence', 'Promo campaign', 'Newsletter template', 'List cleanup'],
        placeholder: 'e.g. Set up a simple welcome email series.',
        tags: ['marketing', 'email', 'newsletter'],
        exampleHint: 'I need an email campaign for new customers.',
      },
      branding: {
        suggestions: ['Brand positioning', 'Messaging guide', 'Tone of voice', 'Launch strategy'],
        placeholder: 'e.g. Define brand message for a new service.',
        tags: ['marketing', 'branding', 'strategy'],
        exampleHint: 'I need help defining my brand message and audience.',
      },
    },
  },
  pt: {
    cleaning: {
      apartment: {
        suggestions: [
          'Limpeza apartamento 2 quartos',
          'Limpeza profunda antes de visitas',
          'Limpeza semanal',
          'Só cozinha e banheiros',
        ],
        placeholder: 'Ex.: Preciso de limpeza profunda em apartamento de 2 quartos.',
        tags: ['limpeza', 'apartamento', 'residencial'],
        exampleHint: 'Preciso de limpeza profunda em apartamento pequeno.',
      },
      house: {
        suggestions: ['Limpeza casa inteira', 'Só térreo', 'Porão / cave', 'Antes de família visitar'],
        placeholder: 'Ex.: Limpeza padrão em casa térrea.',
        tags: ['limpeza', 'casa', 'residencial'],
        exampleHint: 'Preciso de limpeza padrão em casa pequena.',
      },
      commercial: {
        suggestions: ['Escritório pequeno', 'Loja / vitrine', 'Limpeza fora do horário', 'Contrato mensal'],
        placeholder: 'Ex.: Limpeza comercial após o expediente.',
        tags: ['limpeza', 'comercial', 'escritório'],
        exampleHint: 'Limpeza leve em escritório 2x por semana.',
      },
      post_construction: {
        suggestions: ['Pós-obra urgente', 'Pó de drywall', 'Antes dos móveis chegarem', 'Limpeza fina'],
        placeholder: 'Ex.: Limpeza pós-obra no apartamento.',
        tags: ['limpeza', 'pós-obra', 'pó'],
        exampleHint: 'Preciso de limpeza pós-obra em apartamento pequeno.',
      },
      moving_clean: {
        suggestions: ['Limpeza pós-mudança', 'Para vistoria', 'Apartamento vazio', 'Checklist do senhorio'],
        placeholder: 'Ex.: Limpeza pós-mudança para entrega das chaves.',
        tags: ['limpeza', 'mudança', 'vistoria'],
        exampleHint: 'Limpeza pós-mudança em apartamento 3½.',
      },
      windows: {
        suggestions: ['Vidros internos e externos', 'Sacada envidraçada', 'Manchas de água dura', 'Porta de correr'],
        placeholder: 'Ex.: Limpeza de vidros do apartamento.',
        tags: ['limpeza', 'vidros', 'vidro'],
        exampleHint: 'Limpeza de vidros internos em condo 2 quartos.',
      },
      deep: {
        suggestions: ['Dentro da geladeira e forno', 'Rodapés e portas', 'Higienizar banheiros', 'Limpeza profunda geral'],
        placeholder: 'Ex.: Limpeza profunda cozinha e dois banheiros.',
        tags: ['limpeza', 'profunda', 'sanitize'],
        exampleHint: 'Limpeza profunda na cozinha e banheiros.',
      },
    },
    sanitization: {
      sofa: {
        suggestions: ['Sofá de canto', 'Manchas de pet', 'Remoção de odor', 'Proteção do tecido'],
        placeholder: 'Ex.: Higienização de sofá na sala.',
        tags: ['higienização', 'sofá'],
        exampleHint: 'Limpeza profissional de sofá com tratamento de manchas.',
      },
      mattress: {
        suggestions: ['Colchão casal', 'Tratamento alérgico', 'Pós-mudança', 'Quarto infantil'],
        placeholder: 'Ex.: Higienizar colchão após mudança.',
        tags: ['higienização', 'colchão'],
        exampleHint: 'Limpeza profunda e remoção de odores no colchão.',
      },
      car: {
        suggestions: ['Interior do carro', 'Bancos e carpete', 'Pelos de pet', 'Neutralizar odor'],
        placeholder: 'Ex.: Higienização completa do interior do carro.',
        tags: ['higienização', 'carro'],
        exampleHint: 'Limpeza e higienização do interior do veículo.',
      },
      carpet: {
        suggestions: ['Tapete da sala', 'Escadas carpetadas', 'Áreas de passagem', 'Manchas pontuais'],
        placeholder: 'Ex.: Limpeza de carpete em 2 cômodos.',
        tags: ['higienização', 'carpete'],
        exampleHint: 'Limpeza profissional de carpete com tratamento de manchas.',
      },
    },
    moving: uniform(catKeys('moving'), {
      suggestions: [
        'Mudança local esta semana',
        'Preciso de caminhão e equipe',
        'Embalagem e caixas',
        'Itens frágeis / eletrodomésticos',
      ],
      placeholder: 'Ex.: Descreva os dois endereços, volume e acesso (elevador, escadas).',
      tags: ['mudança', 'transporte'],
      exampleHint: 'Preciso mudar do apartamento 3º andar para casa — tem elevador na origem.',
    }),
    translation: {
      government: {
        suggestions: ['Documentos do governo', 'Formulários', 'Serviço presencial', 'Cartas oficiais'],
        placeholder: 'Ex.: Traduzir documento governamental para inglês.',
        tags: ['tradução', 'governo', 'oficial'],
        exampleHint: 'Preciso traduzir documentos para imigração.',
      },
      school: {
        suggestions: ['Boletim escolar', 'Recados da escola', 'Autorizações', 'Resumos'],
        placeholder: 'Ex.: Traduzir documentos escolares.',
        tags: ['tradução', 'escola', 'família'],
        exampleHint: 'Tradução escolar francês → inglês.',
      },
      college: {
        suggestions: ['Programa da faculdade', 'Trabalho acadêmico', 'Histórico', 'Carta de bolsa'],
        placeholder: 'Ex.: Traduzir documentos da faculdade.',
        tags: ['tradução', 'faculdade', 'acadêmico'],
        exampleHint: 'Tradução EN → FR para faculdade.',
      },
      interview: {
        suggestions: ['Preparação para entrevista', 'Simulação de perguntas', 'Negociação salarial', 'E-mail pós-entrevista'],
        placeholder: 'Ex.: Ensaiar entrevista de emprego em inglês.',
        tags: ['tradução', 'entrevista', 'coaching'],
        exampleHint: 'Acompanhamento em entrevista de emprego.',
      },
      document: {
        suggestions: ['Contrato de aluguel', 'Carta do banco', 'Resumo médico', 'Contrato de trabalho'],
        placeholder: 'Ex.: Traduzir documentos pessoais para francês.',
        tags: ['tradução', 'documento', 'oficial'],
        exampleHint: 'Preciso traduzir documentos para o francês.',
      },
      consultation: {
        suggestions: ['Formulário de consulta', 'Termo de consentimento', 'Instruções pós-consulta'],
        placeholder: 'Ex.: Traduzir carta de consulta médica.',
        tags: ['tradução', 'consulta', 'médico'],
        exampleHint: 'Tradução de documentos para consulta.',
      },
      immigration: {
        suggestions: ['Processo de imigração', 'Carta de referência', 'Comprovação de fundos', 'Linha do tempo'],
        placeholder: 'Ex.: Tradução para processo de imigração.',
        tags: ['tradução', 'imigração', 'oficial'],
        exampleHint: 'Tradução para imigração — francês para inglês.',
      },
    },
    automotive: uniform(catKeys('automotive'), {
      suggestions: ['Troca de pneu', 'Bateria descarregada', 'Partida auxiliar / booster', 'Carro não liga'],
      placeholder: 'Ex.: Meu carro não liga no estacionamento.',
      tags: ['automotivo', 'urgente', 'estrada'],
      exampleHint: 'Bateria acabou — preciso de boost no centro.',
    }),
    assembly: uniform(catKeys('assembly'), {
      suggestions: [
        'Móveis IKEA',
        'Guarda-roupa',
        'Cama',
        'Mesa',
        'Escrivaninha',
        'Instalação de TV',
        'Cortina',
        'Suporte de parede',
      ],
      placeholder: 'Ex.: Preciso montar móveis IKEA amanhã.',
      tags: ['montagem', 'móveis', 'IKEA'],
      exampleHint: 'Montagem de guarda-roupa IKEA.',
    }),
    beauty: uniform(catKeys('beauty'), {
      suggestions: [
        'Unhas',
        'Alongamento de unhas',
        'Barbeiro',
        'Cabeleireira',
        'Massagem corporal',
        'Limpeza de pele',
        'Sobrancelha',
        'Depilação',
        'Lash designer',
      ],
      placeholder: 'Ex.: Unhas em casa sábado de manhã.',
      tags: ['beleza', 'estética', 'em-casa'],
      exampleHint: 'Alongamento de unhas e design de sobrancelha em casa.',
    }),
    renovation: uniform(catKeys('renovation'), {
      suggestions: [
        'Hidráulica',
        'Vazamento',
        'Chuveiro / torneira',
        'Pintura',
        'Telhado',
        'Drywall',
        'Pequenos reparos',
      ],
      placeholder: 'Ex.: Vazamento embaixo da pia da cozinha.',
      tags: ['reforma', 'manutenção', 'casa'],
      exampleHint: 'Pequeno reparo hidráulico e pintura.',
    }),
    outdoor: uniform(catKeys('outdoor'), {
      suggestions: ['Remocao de neve', 'Jardim', 'Cerca', 'Limpeza externa', 'Limpeza de piscina'],
      placeholder: 'Ex.: Remocao de neve na entrada e calcada.',
      tags: ['area-externa', 'jardim', 'neve'],
      exampleHint: 'Preciso de ajuda na area externa da casa.',
    }),
    pet: uniform(catKeys('pet'), {
      suggestions: ['Passeio', 'Banho / tosa', 'Cuidador'],
      placeholder: 'Ex.: Passear com o cachorro 2x esta semana.',
      tags: ['pets', 'cao', 'cuidado'],
      exampleHint: 'Preciso de cuidador para meu pet.',
    }),
    other: uniform(catKeys('other'), {
      suggestions: ['Descreva a tarefa', 'Informe local e acesso', 'Diga quando precisa'],
      placeholder: 'Ex.: Descreva a ajuda que voce precisa.',
      tags: ['outros', 'ajuda', 'local'],
      exampleHint: 'Preciso de ajuda com uma tarefa que nao esta nas categorias.',
    }),
    tech: uniform(catKeys('tech'), {
      suggestions: [
        'Formatação / Windows',
        'Wi-Fi',
        'Instalação de programas',
        'TV inteligente',
        'Celular / backup',
      ],
      placeholder: 'Ex.: Wi-Fi não chega no segundo andar.',
      tags: ['TI', 'wifi', 'suporte'],
      exampleHint: 'Preciso configurar Wi-Fi, TV ou celular.',
    }),
    design: {
      logo_brand: {
        suggestions: ['Logo para negócio local', 'Identidade visual', 'Cartão + logo', 'Kit para startup'],
        placeholder: 'Ex.: Preciso de logo e cores para meu negócio.',
        tags: ['design', 'logo', 'marca'],
        exampleHint: 'Preciso de logo e identidade visual simples.',
      },
      social_media: {
        suggestions: ['Posts para Instagram', 'Stories', 'Carrossel promocional', 'Feed do mês'],
        placeholder: 'Ex.: Criar posts para lançamento de produto.',
        tags: ['design', 'redes', 'grafico'],
        exampleHint: 'Preciso de artes para redes sociais este mês.',
      },
      ui_ux: {
        suggestions: ['Layout de landing page', 'Telas de app', 'Wireframes', 'Design system básico'],
        placeholder: 'Ex.: Design de landing page para meu serviço.',
        tags: ['design', 'ui', 'ux'],
        exampleHint: 'Preciso de mockups de interface para um app.',
      },
      print: {
        suggestions: ['Flyer de evento', 'Cardápio', 'Pôster', 'Folder'],
        placeholder: 'Ex.: Flyer para promoção de fim de semana.',
        tags: ['design', 'impresso', 'flyer'],
        exampleHint: 'Preciso de material impresso para divulgação.',
      },
      presentation: {
        suggestions: ['Pitch deck', 'Slides comerciais', 'Apresentação de treino', 'Deck para investidores'],
        placeholder: 'Ex.: Melhorar apresentação de 10 slides.',
        tags: ['design', 'slides', 'apresentacao'],
        exampleHint: 'Preciso de ajuda com slides de apresentação.',
      },
      photo_editing: {
        suggestions: ['Fotos de produto', 'Remover fundo', 'Correção de cor', 'Edição em lote'],
        placeholder: 'Ex.: Editar fotos para loja online.',
        tags: ['design', 'foto', 'edicao'],
        exampleHint: 'Preciso tratar fotos de produtos para venda.',
      },
    },
    marketing: {
      social_media: {
        suggestions: ['Plano de conteúdo mensal', 'Agendamento de posts', 'Gestão de comunidade', 'Estratégia de hashtags'],
        placeholder: 'Ex.: Gerenciar Instagram do meu negócio.',
        tags: ['marketing', 'redes', 'conteudo'],
        exampleHint: 'Preciso de ajuda com redes sociais do negócio.',
      },
      seo: {
        suggestions: ['Perfil Google Business', 'Auditoria SEO local', 'Palavras-chave', 'Ajustes on-page'],
        placeholder: 'Ex.: Melhorar visibilidade no Google local.',
        tags: ['marketing', 'seo', 'google'],
        exampleHint: 'Quero aparecer melhor nas buscas locais.',
      },
      paid_ads: {
        suggestions: ['Anúncios Meta', 'Campanha Google Ads', 'Remarketing', 'Revisão de criativos'],
        placeholder: 'Ex.: Lançar campanha pequena no Google Ads.',
        tags: ['marketing', 'anuncios', 'pago'],
        exampleHint: 'Preciso configurar anúncios pagos com orçamento baixo.',
      },
      content: {
        suggestions: ['Artigos de blog', 'Texto de newsletter', 'Descrições de produto', 'Roteiros de vídeo'],
        placeholder: 'Ex.: Escrever 3 posts para o site.',
        tags: ['marketing', 'conteudo', 'copy'],
        exampleHint: 'Preciso de textos de marketing para site e redes.',
      },
      email: {
        suggestions: ['Sequência de boas-vindas', 'Campanha promocional', 'Template de newsletter', 'Limpeza de lista'],
        placeholder: 'Ex.: Montar e-mails de boas-vindas.',
        tags: ['marketing', 'email', 'newsletter'],
        exampleHint: 'Preciso de campanha de e-mail para novos clientes.',
      },
      branding: {
        suggestions: ['Posicionamento de marca', 'Guia de mensagens', 'Tom de voz', 'Estratégia de lançamento'],
        placeholder: 'Ex.: Definir mensagem da marca para novo serviço.',
        tags: ['marketing', 'marca', 'estrategia'],
        exampleHint: 'Preciso definir mensagem e público da minha marca.',
      },
    },
  },
  fr: {},
};

function deepMergeCategory(lang: Lang, cat: ServiceCategoryId): Record<string, RequestDescriptionCopy> {
  const primary = DATA[lang][cat] ?? {};
  const fallback = DATA.en[cat] ?? {};
  const out: Record<string, RequestDescriptionCopy> = { ...fallback, ...primary };
  return out;
}

/** EN registry — add new categories here for scalability. */
export const categorySuggestionsRegistry: Tree = DATA.en;

export function getRequestDescriptionCopy(
  language: string,
  categoryId: string,
  subKey: string,
): RequestDescriptionCopy {
  const effectiveLang: Lang = language === 'pt' ? 'pt' : 'en';
  const cat = categoryId as ServiceCategoryId;
  const tree = deepMergeCategory(effectiveLang, cat);
  const block = tree[subKey] ?? tree.__default;
  if (block) return block;
  if (language === 'fr') {
    return {
      suggestions: ['Décrivez le lieu, le matériel et l’urgence.', 'Précisez l’accès (interphone, stationnement).'],
      placeholder: 'ex. Décrivez votre besoin en quelques phrases claires.',
      tags: ['aide', 'local', 'flexible'],
    };
  }
  return {
    suggestions: [
      'Describe what you need, where, and when.',
      'Mention tools or materials if relevant.',
      'Add access details (buzzer, parking).',
    ],
    placeholder: 'e.g. Describe your task with a few clear sentences.',
    tags: ['help', 'local', 'flexible'],
  };
}
