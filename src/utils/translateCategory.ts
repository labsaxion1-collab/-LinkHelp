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

export function translateServiceSubcategory(
  categoryRaw: string,
  subRaw: string | null | undefined,
  t: (key: string) => string,
): string {
  if (!subRaw?.trim()) return '';
  const categoryId = resolveCategoryId(categoryRaw);
  if (!categoryId) return subRaw.trim();

  const normalized = subRaw.trim().toLowerCase().replace(/\s+/g, '_');
  const legacySubKey: Record<string, string> = {
    dead_battery: 'battery',
    jump_start: 'jump_start',
    wont_start: 'wont_start',
  };
  const subKey = legacySubKey[normalized] ?? normalized;
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
  const [prefix, ...rest] = title.split(':');
  const suffix = rest.join(':').trim();
  const categoryId = resolveCategoryId(category) || resolveCategoryId(prefix.trim());
  if (!categoryId) return title;

  const categoryLabel = t(`categories.${categoryId}`);
  const subId = (subcategory || suffix).trim().toLowerCase().replace(/\s+/g, '_');
  if (subId) {
    const subKey = `service_subs.${categoryId}.${subId}`;
    const subLabel = t(subKey);
    if (subLabel !== subKey) return `${categoryLabel}: ${subLabel}`;
  }

  return suffix ? `${categoryLabel}: ${suffix}` : categoryLabel;
}
