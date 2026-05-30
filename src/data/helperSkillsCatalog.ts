/**
 * Helper skills are derived from the official service category source.
 * Client request categories and helper "skins" must stay identical.
 */
import {
  SERVICE_CATEGORIES,
  isOfficialServiceSubcategory,
  sanitizeServiceCategoryKeys,
  type ServiceCategoryId,
} from '@/data/serviceCategories';
import { resolveCategoryId } from '@/utils/translateCategory';

export type HelperSkillPrimaryId = ServiceCategoryId;

export type HelperSkillCatalogEntry = {
  readonly id: HelperSkillPrimaryId;
  readonly subs: readonly string[];
};

export const HELPER_SKILLS_CATALOG: readonly HelperSkillCatalogEntry[] = SERVICE_CATEGORIES.map((cat) => ({
  id: cat.id,
  subs: cat.subKeys,
}));

const SERVICE_ID_SET = new Set<string>(SERVICE_CATEGORIES.map((c) => c.id));
const VALID_KEYS = new Set<string>();

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
  pos_obra: 'post_construction',
  posobra: 'post_construction',
  vidros: 'windows',
  sofa: 'sofa',
  colchao: 'mattress',
  carro: 'car',
  carpete: 'carpet',
  escritorio: 'offices',
  escritorios: 'offices',
  empresas: 'companies',
  moveis: 'furniture_transport',
  moveis_ikea: 'ikea',
  guarda_roupa: 'wardrobe',
  bateria: 'battery',
  pneu: 'tire',
  governo: 'government',
  escola: 'school',
  faculdade: 'college',
  documento: 'document',
  consulta: 'consultation',
  hidraulica: 'plumbing',
  vazamento: 'leak',
  chuveiro: 'shower',
  pintura: 'painting',
  telhado: 'roof',
  jardim: 'garden',
  cerca: 'fence',
  passeio: 'walk',
  cuidador: 'sitter',
  formatacao: 'format',
  instalacao: 'install',
  celular: 'phone',
};

const LEGACY_PRIMARY_MAP: Record<string, string | null> = {
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
  area_externa: 'outdoor',
  suporte_em_ti: 'tech',
  informatica: 'tech',
  outros: 'other',
  cozinha: null,
  culinaria: null,
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

  const normalizedPrimary = normalizeLegacyPart(rawPrimary);
  const legacyPrimary = LEGACY_PRIMARY_MAP[normalizedPrimary];
  if (legacyPrimary === null) return null;
  const primary =
    resolveCategoryId(rawPrimary) ??
    resolveCategoryId(normalizedPrimary) ??
    legacyPrimary ??
    normalizedPrimary;

  if (!SERVICE_ID_SET.has(primary)) {
    console.warn('[LinkHelp] Unknown helper category ignored', rawPrimary);
    return null;
  }

  const sub = LEGACY_SUB_MAP[normalizeLegacyPart(rawSub)] ?? normalizeLegacyPart(rawSub);
  if (!isOfficialServiceSubcategory(primary, sub)) {
    console.warn('[LinkHelp] Unknown helper subcategory ignored', `${primary}:${rawSub}`);
    return null;
  }

  return skillKey(primary, sub);
}

export function parseSkillKey(key: string): { primary: string; sub: string } | null {
  const normalized = normalizeSkillKey(key);
  if (!normalized) return null;
  const i = normalized.indexOf(':');
  if (i <= 0 || i >= normalized.length - 1) return null;
  const primary = normalized.slice(0, i);
  const sub = normalized.slice(i + 1);
  if (!isOfficialServiceSubcategory(primary, sub)) return null;
  return { primary, sub };
}

export function isValidSkillKey(key: string): boolean {
  const normalized = normalizeSkillKey(key);
  return Boolean(normalized && VALID_KEYS.has(normalized));
}

export function filterValidSkillKeys(keys: string[]): string[] {
  return sanitizeServiceCategoryKeys((Array.isArray(keys) ? keys : []).map(normalizeSkillKey).filter(Boolean));
}

export function getPrimaryCategories(): readonly HelperSkillCatalogEntry[] {
  return HELPER_SKILLS_CATALOG;
}

export function getSubsForPrimary(primaryId: string): readonly string[] {
  return SERVICE_CATEGORIES.find((c) => c.id === primaryId)?.subKeys ?? [];
}

export function groupSkillKeysByPrimary(keys: string[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const key of filterValidSkillKeys(keys)) {
    const parsed = parseSkillKey(key);
    if (!parsed) continue;
    const list = map.get(parsed.primary) ?? [];
    list.push(key);
    map.set(parsed.primary, list);
  }
  return new Map(SERVICE_CATEGORIES.filter((c) => map.has(c.id)).map((c) => [c.id, map.get(c.id)!]));
}

export function groupSkillKeysByServiceCategory(keys: string[]): Map<string, string[]> {
  return groupSkillKeysByPrimary(keys);
}

export function skillSubLabelKey(primary: string, sub: string): string {
  return `service_subs.${primary}.${sub}`;
}

export function skillPrimaryLabelKey(primary: string): string {
  return `categories.${primary}`;
}

export function getServiceCategorySubs(categoryId: string): readonly string[] {
  return SERVICE_CATEGORIES.find((c) => c.id === categoryId)?.subKeys ?? [];
}
