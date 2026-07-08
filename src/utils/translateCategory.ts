import { SERVICE_CATEGORIES, isOfficialServiceSubcategory } from '@/data/serviceCategories';

const SERVICE_IDS = new Set(SERVICE_CATEGORIES.map((c) => c.id));

const LANDING_IDS = [
  'translation',
  'interpretation',
  'furniture',
  'cleaning',
  'snow',
  'moving',
  'gardening',
  'home',
  'delivery',
  'renovation',
  'outdoor',
  'assembly',
  'beauty',
  'tech',
  'pet',
  'automotive',
] as const;

const LANDING_SET = new Set<string>(LANDING_IDS);

/** Portuguese / legacy labels from mock data → stable category id */
const LEGACY_CATEGORY_MAP: Record<string, string> = {
  Montagem: 'assembly',
  'Montagem de Móveis': 'furniture',
  'Montagem de Móveis IKEA': 'assembly',
  'Montagem e instalação': 'assembly',
  'Pequena Mudança': 'moving',
  'Pequenas Mudanças': 'moving',
  Mudança: 'moving',
  'Mudanças e entregas': 'moving',
  Limpeza: 'cleaning',
  Tradução: 'translation',
  Translation: 'translation',
  Higienização: 'sanitization',
  Automotivo: 'automotive',
  'Reforma e manutenção': 'renovation',
  Cleaning: 'cleaning',
  Sanitization: 'sanitization',
  Automotive: 'automotive',
  'Assembly & installation': 'assembly',
  'Aesthetics & beauty': 'beauty',
  'Moves & deliveries': 'moving',
  'Renovation & maintenance': 'renovation',
  'Outdoor & yard': 'outdoor',
  Pets: 'pet',
  'IT support': 'tech',
  Design: 'design',
  Marketing: 'marketing',
  'Design gráfico': 'design',
  'Design grafico': 'design',
  'Design graphique': 'design',
  'Marketing digital': 'marketing',
  Nettoyage: 'cleaning',
  Hygiénisation: 'sanitization',
  Automobile: 'automotive',
  'Montage et installation': 'assembly',
  Traduction: 'translation',
  'Esthétique et beauté': 'beauty',
  'Déménagement et livraisons': 'moving',
  'Rénovation et entretien': 'renovation',
  'Espaces extérieurs': 'outdoor',
  Animaux: 'pet',
  'Support informatique': 'tech',
  Delivery: 'delivery',
  'Auxílio em Entregas': 'delivery',
  Elétrica: 'renovation',
  Reparos: 'renovation',
  Jardinagem: 'gardening',
  'Remoção de Neve': 'snow',
  Interpretação: 'interpretation',
  'Ajuda Doméstica': 'home',
  'Faz-tudo': 'renovation',
  electrical: 'renovation',
  handyman: 'renovation',
};

const SUB_KEY_ALIASES: Record<string, string> = {
  dead_battery: 'battery',
  jump_start: 'jump_start',
  wont_start: 'wont_start',
};

/**
 * Legacy localized subcategory labels (PT / EN / FR) → stable subcategory key.
 * Keys are slugified via `slugifyLabel`.
 */
const LEGACY_SUB_LABELS: Partial<Record<string, Record<string, string[]>>> = {
  cleaning: {
    apartment: ['Apartamento', 'Apartment', 'Appartement'],
    house: ['Casa', 'House', 'Maison'],
    commercial: ['Comercial', 'Commercial'],
    post_construction: ['Pós-obra', 'Post-construction', 'Après-travaux'],
    moving_clean: ['Limpeza na mudança', 'Move-out cleaning'],
    windows: ['Vidros', 'Windows', 'Vitres'],
  },
  sanitization: {
    sofa: ['Sofá', 'Sofa', 'Canapé'],
    mattress: ['Colchão', 'Mattress', 'Matelas'],
    car: ['Carro', 'Car', 'Voiture'],
    carpet: ['Carpete', 'Carpet', 'Tapis'],
  },
  moving: {
    houses: ['Casas', 'Houses', 'Maisons'],
    apartments: ['Apartamentos', 'Apartments', 'Appartements'],
    offices: ['Escritórios', 'Offices', 'Bureaux'],
    companies: ['Empresas', 'Companies', 'Entreprises'],
    furniture_transport: ['Transporte de móveis', 'Furniture transport'],
    long_distance: ['Mudança longa distância', 'Long-distance move'],
    small_moves: ['Pequenas mudanças', 'Small moves', 'Petits déménagements'],
  },
  assembly: {
    ikea: ['Móveis IKEA', 'IKEA furniture', 'Meubles IKEA'],
    wardrobe: ['Guarda-roupa', 'Wardrobe', 'Armoire'],
    bed: ['Cama', 'Bed', 'Lit'],
    table: ['Mesa', 'Table'],
    desk: ['Escrivaninha', 'Desk', 'Bureau'],
    tv_mount: ['Instalação de TV', 'TV mount', 'Installation TV'],
    curtains: ['Cortina', 'Curtains', 'Rideaux'],
    wall_mount: ['Suporte de parede', 'Wall mount'],
  },
  automotive: {
    tire: ['Troca de pneu', 'Tire change', 'Changement de pneu'],
    battery: ['Bateria descarregada', 'Dead battery', 'Batterie déchargée'],
    jump_start: ['Partida auxiliar', 'Jump start', 'Démarrage assisté'],
    wont_start: ['Carro não liga', "Won't start", 'Ne démarre pas'],
  },
  translation: {
    government: ['Governo', 'Government', 'Gouvernement'],
    school: ['Escola', 'School', 'École'],
    college: ['Faculdade', 'College / university', 'Collège / université'],
    interview: ['Entrevista', 'Interview', 'Entrevue'],
    document: ['Documento', 'Document'],
    consultation: ['Consulta', 'Consultation'],
    immigration: ['Imigração', 'Immigration'],
  },
  beauty: {
    nails: ['Unhas', 'Nails', 'Ongles'],
    nail_extensions: ['Alongamento de unhas', 'Nail extensions'],
    barber: ['Barbeiro', 'Barber', 'Barbier'],
    hairdresser: ['Cabeleireira', 'Hairdresser', 'Coiffeur'],
    body_massage: ['Massagem corporal', 'Body massage'],
    facial_cleansing: ['Limpeza de pele', 'Facial cleansing'],
    brows: ['Sobrancelha', 'Brows', 'Sourcils'],
    waxing: ['Depilação', 'Waxing', 'Épilation'],
    lashes: ['Lash designer', 'Lashes', 'Cils'],
  },
  renovation: {
    plumbing: ['Hidráulica', 'Plumbing', 'Plomberie'],
    leak: ['Vazamento', 'Leak', 'Fuite'],
    shower: ['Chuveiro', 'Shower', 'Douche'],
    painting: ['Pintura', 'Painting', 'Peinture'],
    roof: ['Telhado', 'Roof', 'Toit'],
    drywall: ['Drywall'],
    small_repairs: ['Pequenos reparos', 'Small repairs', 'Petites réparations'],
  },
  outdoor: {
    snow: ['Remoção de neve', 'Snow removal', 'Déneigement'],
    garden: ['Jardim', 'Garden', 'Jardin'],
    fence: ['Cerca', 'Fence', 'Clôture'],
    exterior_clean: ['Limpeza externa', 'Exterior cleaning'],
    pool_cleaning: ['Limpeza de piscina', 'Pool cleaning'],
  },
  pet: {
    walk: ['Passeio', 'Dog walk', 'Promenade'],
    bath: ['Banho / tosa', 'Bath / grooming', 'Bain / toilettage'],
    sitter: ['Cuidador', 'Pet sitter', 'Gardien'],
  },
  tech: {
    format: ['Formatação', 'PC reset', 'Formatage'],
    wifi: ['Wi‑Fi', 'Wi-Fi'],
    install: ['Instalação', 'Installation'],
    tv: ['TV'],
    phone: ['Celular', 'Phone', 'Téléphone'],
  },
  design: {
    logo_brand: ['Logo e identidade visual', 'Logo & branding'],
    social_media: ['Artes para redes sociais', 'Social media graphics'],
    ui_ux: ['UI/UX (site ou app)', 'UI/UX'],
    print: ['Material impresso', 'Print materials'],
    presentation: ['Apresentações / slides', 'Presentations / slides'],
    photo_editing: ['Edição de fotos', 'Photo editing'],
  },
  marketing: {
    social_media: ['Gestão de redes sociais', 'Social media management'],
    seo: ['SEO / Google'],
    paid_ads: ['Anúncios pagos', 'Paid ads', 'Publicités payantes'],
    content: ['Criação de conteúdo', 'Content creation'],
    email: ['E-mail marketing', 'Email marketing'],
    branding: ['Estratégia de marca', 'Branding strategy'],
  },
  other: {
    other: ['Outros', 'Other', 'Autre'],
  },
};

export const ALL_CATEGORY_IDS = new Set<string>([...SERVICE_IDS, ...LANDING_SET]);

export function slugifyLabel(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function buildLegacySubSlugMap(): Record<string, Record<string, string>> {
  const map: Record<string, Record<string, string>> = {};

  for (const cat of SERVICE_CATEGORIES) {
    map[cat.id] = {};
    for (const subKey of cat.subKeys) {
      map[cat.id][subKey] = subKey;
      map[cat.id][slugifyLabel(subKey)] = subKey;

      const labels = LEGACY_SUB_LABELS[cat.id]?.[subKey] ?? [];
      for (const label of labels) {
        const slug = slugifyLabel(label);
        if (slug) map[cat.id][slug] = subKey;
      }
    }
  }

  return map;
}

const LEGACY_SUB_SLUG_MAP = buildLegacySubSlugMap();

export function resolveCategoryId(raw: string): string | null {
  if (!raw) return null;
  if (ALL_CATEGORY_IDS.has(raw)) return raw;
  const slug = slugifyLabel(raw);
  if (ALL_CATEGORY_IDS.has(slug)) return slug;
  return LEGACY_CATEGORY_MAP[raw] ?? LEGACY_CATEGORY_MAP[raw.trim()] ?? null;
}

export function resolveSubcategoryId(categoryRaw: string, subRaw: string | null | undefined): string | null {
  if (!subRaw?.trim()) return null;
  const categoryId = resolveCategoryId(categoryRaw);
  if (!categoryId) return null;

  const trimmed = subRaw.trim();
  const normalized = slugifyLabel(trimmed);
  if (!normalized) return null;

  if (isOfficialServiceSubcategory(categoryId, normalized)) return normalized;

  const alias = SUB_KEY_ALIASES[normalized];
  if (alias && isOfficialServiceSubcategory(categoryId, alias)) return alias;

  const mapped = LEGACY_SUB_SLUG_MAP[categoryId]?.[normalized];
  if (mapped) return mapped;

  return null;
}

/** Stable title persisted in DB — independent of UI locale. */
export function buildCanonicalJobTitle(categoryId: string, subcategoryId?: string | null): string {
  const cat = resolveCategoryId(categoryId);
  if (!cat) return categoryId.trim();
  const sub = subcategoryId ? resolveSubcategoryId(cat, subcategoryId) : null;
  if (sub) return `${cat}:${sub}`;
  return cat;
}

export function parseCanonicalJobTitle(title: string): {
  categoryId: string;
  subcategoryId: string | null;
} | null {
  const trimmed = title.trim();
  if (!trimmed) return null;

  if (!trimmed.includes(':')) {
    const categoryId = resolveCategoryId(trimmed);
    return categoryId ? { categoryId, subcategoryId: null } : null;
  }

  const [prefix, ...rest] = trimmed.split(':');
  const suffix = rest.join(':').trim();
  const categoryId = resolveCategoryId(prefix.trim());
  if (!categoryId) return null;

  const subcategoryId = suffix ? resolveSubcategoryId(categoryId, suffix) : null;
  return { categoryId, subcategoryId };
}

export function translateCategory(raw: string, t: (key: string) => string): string {
  const id = resolveCategoryId(raw);
  if (id) return t(`categories.${id}`);
  return raw;
}

export function translateServiceSubcategory(
  categoryRaw: string,
  subRaw: string | null | undefined,
  t: (key: string) => string,
): string {
  if (!subRaw?.trim()) return '';
  const categoryId = resolveCategoryId(categoryRaw);
  if (!categoryId) return subRaw.trim();

  const subKey = resolveSubcategoryId(categoryId, subRaw);
  if (!subKey) return subRaw.trim();

  const i18nKey = `service_subs.${categoryId}.${subKey}`;
  const label = t(i18nKey);
  return label !== i18nKey ? label : subRaw.trim();
}

export function translateJobTitle(
  title: string,
  category: string,
  subcategory: string | null | undefined,
  t: (key: string) => string,
): string {
  const canonical = parseCanonicalJobTitle(title);

  let categoryId = resolveCategoryId(category) ?? canonical?.categoryId ?? null;
  if (!categoryId && title.includes(':')) {
    const [prefix] = title.split(':');
    categoryId = resolveCategoryId(prefix.trim());
  }
  if (!categoryId) return title.trim() || title;

  const categoryLabel = t(`categories.${categoryId}`);

  const subKey =
    (subcategory ? resolveSubcategoryId(categoryId, subcategory) : null) ??
    canonical?.subcategoryId ??
    (title.includes(':')
      ? resolveSubcategoryId(categoryId, title.split(':').slice(1).join(':').trim())
      : null);

  if (subKey) {
    const subLabel = t(`service_subs.${categoryId}.${subKey}`);
    if (subLabel !== `service_subs.${categoryId}.${subKey}`) {
      return `${categoryLabel}: ${subLabel}`;
    }
  }

  if (!title.includes(':')) return categoryLabel;

  const suffix = title.split(':').slice(1).join(':').trim();
  if (!suffix) return categoryLabel;

  if (resolveCategoryId(suffix) === categoryId) return categoryLabel;

  return `${categoryLabel}: ${suffix}`;
}
