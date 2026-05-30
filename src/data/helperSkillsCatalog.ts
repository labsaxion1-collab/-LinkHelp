/**
 * Helper skills — primary category + subcategory (stored as `primary:sub` keys).
 * Synced to `helper_skills` (category, subcategory) in Supabase.
 */
import { SERVICE_CATEGORIES } from '@/data/serviceCategories';
import { resolveCategoryId } from '@/utils/translateCategory';

export type HelperSkillPrimaryId =
  | 'electrical'
  | 'plumbing'
  | 'sanitization'
  | 'general_services'
  | 'cleaning'
  | 'beauty'
  | 'moving'
  | 'automotive';

export type HelperSkillCatalogEntry = {
  readonly id: HelperSkillPrimaryId;
  readonly subs: readonly string[];
};

export const HELPER_SKILLS_CATALOG: readonly HelperSkillCatalogEntry[] = [
  {
    id: 'electrical',
    subs: [
      'outlets',
      'switches',
      'light_fixtures',
      'ceiling_fan',
      'breakers',
      'electrical_panel',
      'short_circuit',
      'wiring',
      'bulb_replacement',
      'led_install',
      'electric_shower',
    ],
  },
  {
    id: 'plumbing',
    subs: [
      'plumbing_general',
      'leaks',
      'sinks',
      'faucets',
      'sewage',
      'flush',
      'showers',
      'broken_pipe',
      'toilet_install',
      'unclogging',
      'water_tank',
      'washing_machine_hookup',
    ],
  },
  {
    id: 'sanitization',
    subs: [
      'sofas',
      'carpets',
      'mattresses',
      'pillows',
      'car_seats',
      'car_interior',
      'rugs',
      'chairs',
      'odor_removal',
      'deep_cleaning',
    ],
  },
  {
    id: 'general_services',
    subs: [
      'snow_removal',
      'gardening',
      'lawn_mowing',
      'door_repairs',
      'window_repairs',
      'furniture_assembly',
      'small_repairs',
      'shelf_install',
      'lock_replacement',
      'junk_removal',
    ],
  },
  {
    id: 'cleaning',
    subs: [
      'houses',
      'apartments',
      'offices',
      'party_hall',
      'pools',
      'heavy_cleaning',
      'post_construction',
      'commercial',
      'residential',
      'windows',
      'airbnb',
      'condominiums',
    ],
  },
  {
    id: 'beauty',
    subs: [
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
    id: 'moving',
    subs: [
      'houses',
      'apartments',
      'offices',
      'companies',
      'furniture_transport',
      'assembly_disassembly',
      'packing',
      'loading',
      'unloading',
      'local_move',
      'small_moves',
      'express_freight',
      'appliances_transport',
    ],
  },
  {
    id: 'automotive',
    subs: [
      'tire_change',
      'roadside_assistance',
      'dead_battery',
      'parts_replacement',
      'oil_change',
      'diagnostics',
      'car_wash',
      'interior_sanitization',
      'polishing',
      'accessories_install',
      'electrical_failure',
      'headlight_replacement',
    ],
  },
] as const;

/** Legacy beauty subcategories kept for existing DB rows (hidden from new selections). */
export const BEAUTY_LEGACY_SUBS = [
  'manicure',
  'pedicure',
  'hair',
  'makeup',
  'blowout',
  'beard',
  'mens_cut',
  'womens_cut',
] as const;

const PRIMARY_SET = new Set(HELPER_SKILLS_CATALOG.map((c) => c.id));
const SERVICE_ID_SET = new Set(SERVICE_CATEGORIES.map((c) => c.id));
const VALID_KEYS = new Set<string>();

for (const cat of HELPER_SKILLS_CATALOG) {
  for (const sub of cat.subs) {
    VALID_KEYS.add(skillKey(cat.id, sub));
  }
}
for (const sub of BEAUTY_LEGACY_SUBS) {
  VALID_KEYS.add(skillKey('beauty', sub));
}

for (const cat of SERVICE_CATEGORIES) {
  for (const sub of cat.subKeys) {
    VALID_KEYS.add(skillKey(cat.id, sub));
  }
}

export function skillKey(primary: string, sub: string): string {
  return `${primary}:${sub}`;
}

const LEGACY_SUB_MAP: Record<string, string> = {
  apartamento: 'apartment',
  apartamentos: 'apartments',
  casa: 'house',
  casas: 'houses',
  comercial: 'commercial',
  escritorio: 'offices',
  escritorios: 'offices',
  condominio: 'condominium',
  condomínio: 'condominium',
  governo: 'government',
  escola: 'school',
  faculdade: 'college',
  documento: 'document',
  documentos: 'document',
  carro: 'car',
  bateria: 'battery',
  pneu: 'tire',
};

const LEGACY_PRIMARY_MAP: Record<string, string> = {
  limpeza: 'cleaning',
  higienizacao: 'sanitization',
  mudancas: 'moving',
  mudancas_e_entregas: 'moving',
  mudanca: 'moving',
  entregas: 'moving',
  montagem: 'assembly',
  montagem_e_instalacao: 'assembly',
  instalacao: 'assembly',
  instalacao_e_montagem: 'assembly',
  automotivo: 'automotive',
  traducao: 'translation',
  estetica: 'beauty',
  beleza: 'beauty',
  reforma: 'renovation',
  manutencao: 'renovation',
  jardinagem: 'outdoor',
  cozinha: 'cooking',
  culinaria: 'cooking',
  suporte_em_ti: 'tech',
  informatica: 'tech',
};

function normalizeLegacyPart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');
}

export function normalizeSkillKey(key: unknown): string | null {
  if (typeof key !== 'string') return null;
  const rawKey = key.trim();
  const i = rawKey.indexOf(':');
  if (i <= 0 || i >= rawKey.length - 1) return null;
  const rawPrimary = rawKey.slice(0, i).trim();
  const rawSub = rawKey.slice(i + 1).trim();
  if (!rawPrimary || !rawSub) return null;

  const primary =
    resolveCategoryId(rawPrimary) ??
    resolveCategoryId(normalizeLegacyPart(rawPrimary)) ??
    LEGACY_PRIMARY_MAP[normalizeLegacyPart(rawPrimary)] ??
    normalizeLegacyPart(rawPrimary);
  const sub = LEGACY_SUB_MAP[normalizeLegacyPart(rawSub)] ?? normalizeLegacyPart(rawSub);

  if (SERVICE_ID_SET.has(primary)) {
    const svc = SERVICE_CATEGORIES.find((c) => c.id === primary);
    if (svc && (svc.subKeys as readonly string[]).includes(sub)) return skillKey(primary, sub);
  }

  if (PRIMARY_SET.has(primary as HelperSkillPrimaryId)) {
    const cat = HELPER_SKILLS_CATALOG.find((c) => c.id === primary);
    if (cat && (cat.subs as readonly string[]).includes(sub)) return skillKey(primary, sub);
    if (primary === 'beauty' && (BEAUTY_LEGACY_SUBS as readonly string[]).includes(sub)) {
      return skillKey(primary, sub);
    }
  }

  return null;
}

export function parseSkillKey(key: string): { primary: string; sub: string } | null {
  const normalized = normalizeSkillKey(key);
  if (!normalized) return null;
  const i = normalized.indexOf(':');
  if (i <= 0 || i >= normalized.length - 1) return null;
  const primary = normalized.slice(0, i);
  const sub = normalized.slice(i + 1);
  const svc = SERVICE_CATEGORIES.find((c) => c.id === primary);
  if (svc && (svc.subKeys as readonly string[]).includes(sub)) return { primary, sub };
  if (!PRIMARY_SET.has(primary as HelperSkillPrimaryId)) return null;
  const cat = HELPER_SKILLS_CATALOG.find((c) => c.id === primary);
  if (cat && (cat.subs as readonly string[]).includes(sub)) return { primary, sub };
  if (primary === 'beauty' && (BEAUTY_LEGACY_SUBS as readonly string[]).includes(sub)) {
    return { primary, sub };
  }
  return null;
}

export function isValidSkillKey(key: string): boolean {
  const normalized = normalizeSkillKey(key);
  return Boolean(normalized && VALID_KEYS.has(normalized));
}

export function filterValidSkillKeys(keys: string[]): string[] {
  const seen = new Set<string>();
  const valid: string[] = [];
  for (const key of Array.isArray(keys) ? keys : []) {
    const normalized = normalizeSkillKey(key);
    if (!normalized || !VALID_KEYS.has(normalized) || seen.has(normalized)) continue;
    seen.add(normalized);
    valid.push(normalized);
  }
  return valid;
}

export function getPrimaryCategories(): readonly HelperSkillCatalogEntry[] {
  return HELPER_SKILLS_CATALOG;
}

export function getSubsForPrimary(primaryId: string): readonly string[] {
  return HELPER_SKILLS_CATALOG.find((c) => c.id === primaryId)?.subs ?? [];
}

export function groupSkillKeysByPrimary(keys: string[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const key of keys) {
    const parsed = parseSkillKey(key);
    if (!parsed) continue;
    const list = map.get(parsed.primary) ?? [];
    list.push(key);
    map.set(parsed.primary, list);
  }
  const order = [
    ...SERVICE_CATEGORIES.map((c) => c.id),
    ...HELPER_SKILLS_CATALOG.map((c) => c.id),
  ];
  const seen = new Set<string>();
  return new Map(
    order.filter((id) => map.has(id) && !seen.has(id) && seen.add(id)).map((id) => [id, map.get(id)!]),
  );
}

export function groupSkillKeysByServiceCategory(keys: string[]): Map<string, string[]> {
  const serviceIds = new Set(SERVICE_CATEGORIES.map((c) => c.id));
  const map = new Map<string, string[]>();
  for (const key of keys) {
    const parsed = parseSkillKey(key);
    if (!parsed || !serviceIds.has(parsed.primary)) continue;
    const list = map.get(parsed.primary) ?? [];
    list.push(key);
    map.set(parsed.primary, list);
  }
  return new Map(SERVICE_CATEGORIES.filter((c) => map.has(c.id)).map((c) => [c.id, map.get(c.id)!]));
}

export function skillSubLabelKey(primary: string, sub: string): string {
  if (SERVICE_CATEGORIES.some((c) => c.id === primary)) return `service_subs.${primary}.${sub}`;
  return `helper_skills.sub.${primary}.${sub}`;
}

export function skillPrimaryLabelKey(primary: string): string {
  if (SERVICE_CATEGORIES.some((c) => c.id === primary)) return `categories.${primary}`;
  return `helper_skills.primary.${primary}`;
}

export function getServiceCategorySubs(categoryId: string): readonly string[] {
  return SERVICE_CATEGORIES.find((c) => c.id === categoryId)?.subKeys ?? [];
}
