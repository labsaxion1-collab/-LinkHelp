/**
 * Main categories for the client create-request flow.
 * Labels: `t(\`categories.${id}\`)`. Quick subs: `t(\`service_subs.${id}.${subKey}\`)`.
 */
export const SERVICE_CATEGORIES = [
  {
    id: 'cleaning',
    icon: 'Sparkles',
    subKeys: ['apartment', 'house', 'commercial', 'post_construction', 'moving_clean', 'windows'],
  },
  {
    id: 'sanitization',
    icon: 'SprayCan',
    subKeys: ['sofa', 'mattress', 'car', 'carpet'],
  },
  {
    id: 'moving',
    icon: 'Truck',
    subKeys: ['houses', 'apartments', 'offices', 'companies', 'furniture_transport', 'long_distance', 'small_moves'],
  },
  {
    id: 'assembly',
    icon: 'Hammer',
    subKeys: ['ikea', 'wardrobe', 'bed', 'table', 'desk', 'tv_mount', 'curtains', 'wall_mount'],
  },
  { id: 'automotive', icon: 'Car', subKeys: ['tire', 'battery', 'jump_start', 'wont_start'] },
  {
    id: 'translation',
    icon: 'Languages',
    subKeys: ['government', 'school', 'college', 'document', 'consultation'],
  },
  {
    id: 'beauty',
    icon: 'Smile',
    subKeys: [
      'nails',
      'nail_extensions',
      'barber',
      'hairdresser',
      'body_massage',
      'facial_cleansing',
      'brows',
      'waxing',
      'lashes',
    ],
  },
  {
    id: 'renovation',
    icon: 'Wrench',
    subKeys: ['plumbing', 'leak', 'shower', 'painting', 'roof', 'drywall', 'small_repairs'],
  },
  {
    id: 'outdoor',
    icon: 'TreePine',
    subKeys: ['snow', 'garden', 'fence', 'exterior_clean', 'pool_cleaning'],
  },
  {
    id: 'pet',
    icon: 'Dog',
    subKeys: ['walk', 'bath', 'sitter'],
  },
  {
    id: 'tech',
    icon: 'Monitor',
    subKeys: ['format', 'wifi', 'install', 'tv', 'phone'],
  },
  {
    id: 'other',
    icon: 'CircleHelp',
    subKeys: ['other'],
  },
] as const;

export type ServiceCategoryId = (typeof SERVICE_CATEGORIES)[number]['id'];

const OFFICIAL_CATEGORY_IDS = new Set<string>(SERVICE_CATEGORIES.map((c) => c.id));
const OFFICIAL_SUB_BY_CATEGORY = new Map<string, Set<string>>(
  SERVICE_CATEGORIES.map((c) => [c.id, new Set<string>([...c.subKeys])]),
);

export function isOfficialServiceCategoryId(value: unknown): value is ServiceCategoryId {
  return typeof value === 'string' && OFFICIAL_CATEGORY_IDS.has(value);
}

export function isOfficialServiceSubcategory(categoryId: unknown, subKey: unknown): boolean {
  if (typeof categoryId !== 'string' || typeof subKey !== 'string') return false;
  return Boolean(OFFICIAL_SUB_BY_CATEGORY.get(categoryId)?.has(subKey));
}

export function sanitizeServiceCategoryKeys(keys: unknown): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of Array.isArray(keys) ? keys : []) {
    if (typeof raw !== 'string') continue;
    const [categoryId, subKey] = raw.split(':');
    if (!isOfficialServiceSubcategory(categoryId, subKey)) continue;
    const key = `${categoryId}:${subKey}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}
