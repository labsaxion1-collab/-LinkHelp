import { SERVICE_CATEGORIES } from '@/data/serviceCategories';

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
  'cooking',
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
  'Pequena Mudança': 'moving',
  'Pequenas Mudanças': 'moving',
  Mudança: 'moving',
  Limpeza: 'cleaning',
  Tradução: 'translation',
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

export const ALL_CATEGORY_IDS = new Set<string>([...SERVICE_IDS, ...LANDING_SET]);

export function resolveCategoryId(raw: string): string | null {
  if (!raw) return null;
  if (ALL_CATEGORY_IDS.has(raw)) return raw;
  return LEGACY_CATEGORY_MAP[raw] ?? null;
}

export function translateCategory(raw: string, t: (key: string) => string): string {
  const id = resolveCategoryId(raw);
  if (id) return t(`categories.${id}`);
  return raw;
}
