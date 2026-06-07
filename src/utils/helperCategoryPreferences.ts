import { SERVICE_CATEGORIES, type ServiceCategoryId } from '@/data/serviceCategories';
import { filterValidSkillKeys, parseSkillKey } from '@/data/helperSkillsCatalog';
import type { Job } from '@/types/job';
import { resolveCategoryId } from '@/utils/translateCategory';

type ProfileCategoryFields = {
  primary_category?: string | null;
  secondary_categories?: string[] | null;
};

export type HelperCategoryPreferences = {
  primaryCategory: ServiceCategoryId;
  secondaryCategories: ServiceCategoryId[];
  visibleCategories: ServiceCategoryId[];
  hasExplicitPreference: boolean;
};

export { HELPER_CATEGORY_ACCENTS } from '@/utils/categoryFeedTheme';

const SERVICE_ID_SET = new Set<string>(SERVICE_CATEGORIES.map((c) => c.id));
const warnedCategoryKeys = new Set<string>();

const LEGACY_CATEGORY_ID_MAP: Record<string, ServiceCategoryId> = {
  limpeza: 'cleaning',
  higienizacao: 'sanitization',
  mudanca: 'moving',
  mudancas: 'moving',
  mudancas_e_entregas: 'moving',
  entregas: 'moving',
  montagem: 'assembly',
  montagem_e_instalacao: 'assembly',
  instalacao: 'assembly',
  automotivo: 'automotive',
  traducao: 'translation',
  estetica: 'beauty',
  beleza: 'beauty',
  reforma: 'renovation',
  manutencao: 'renovation',
  area_externa: 'outdoor',
  jardinagem: 'outdoor',
  pets: 'pet',
  pet: 'pet',
  suporte_em_ti: 'tech',
  informatica: 'tech',
  design: 'design',
  designer: 'design',
  marketing: 'marketing',
  markting: 'marketing',
  outros: 'other',
};

function normalizeLegacyCategoryKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[&/]+/g, ' ')
    .replace(/\s+/g, '_');
}

const SKILL_PRIMARY_TO_SERVICE: Record<string, ServiceCategoryId> = {
  electrical: 'renovation',
  plumbing: 'renovation',
  general_services: 'renovation',
  cleaning: 'cleaning',
  sanitization: 'sanitization',
  beauty: 'beauty',
  moving: 'moving',
  automotive: 'automotive',
};

export function normalizeHelperCategoryId(raw?: string | null): ServiceCategoryId | null {
  if (!raw) return null;
  const resolved =
    resolveCategoryId(raw) ??
    resolveCategoryId(normalizeLegacyCategoryKey(raw)) ??
    LEGACY_CATEGORY_ID_MAP[normalizeLegacyCategoryKey(raw)] ??
    raw;
  if (SERVICE_ID_SET.has(resolved)) return resolved as ServiceCategoryId;
  if (!warnedCategoryKeys.has(String(raw))) {
    warnedCategoryKeys.add(String(raw));
    console.warn('[LinkHelp] Unknown helper category key ignored:', raw);
  }
  return null;
}

export function categoryIdsFromSkillKeys(skillIds?: string[] | null): ServiceCategoryId[] {
  const seen = new Set<ServiceCategoryId>();
  for (const key of Array.isArray(skillIds) ? skillIds : []) {
    const parsed = parseSkillKey(key);
    if (!parsed) {
      if (typeof key === 'string' && key.trim() && !warnedCategoryKeys.has(key)) {
        warnedCategoryKeys.add(key);
        console.warn('[LinkHelp] Unknown helper skill key ignored:', key);
      }
      continue;
    }
    if (SERVICE_ID_SET.has(parsed.primary)) {
      seen.add(parsed.primary as ServiceCategoryId);
      continue;
    }
    const mapped = SKILL_PRIMARY_TO_SERVICE[parsed.primary];
    if (mapped) seen.add(mapped);
  }
  return [...seen];
}

/** Derive primary + all secondary categories from saved skill keys. */
export function deriveHelperCategoriesFromSkillKeys(
  skillIds?: string[] | null,
  preferredPrimary?: ServiceCategoryId | null,
): { primary: ServiceCategoryId; secondary: ServiceCategoryId[] } {
  const cats = categoryIdsFromSkillKeys(filterValidSkillKeys(Array.isArray(skillIds) ? skillIds : []));
  if (cats.length === 0) {
    return { primary: preferredPrimary ?? 'cleaning', secondary: [] };
  }
  const primary =
    preferredPrimary && cats.includes(preferredPrimary) ? preferredPrimary : cats[0];
  const secondary = cats.filter((id) => id !== primary);
  return { primary, secondary };
}

export function getHelperCategoryPreferences(
  profile: ProfileCategoryFields | null | undefined,
  skillIds: string[] | null | undefined = [],
): HelperCategoryPreferences {
  const fromSkills = categoryIdsFromSkillKeys(skillIds);
  const explicitPrimary = normalizeHelperCategoryId(profile?.primary_category);
  const rawSecondary = Array.isArray(profile?.secondary_categories) ? profile.secondary_categories : [];
  const explicitSecondary = rawSecondary
    .map((id) => normalizeHelperCategoryId(id))
    .filter((id): id is ServiceCategoryId => Boolean(id));

  if (fromSkills.length > 0) {
    const { primary, secondary } = deriveHelperCategoriesFromSkillKeys(skillIds, explicitPrimary);
    const visibleCategories = [primary, ...secondary];
    return {
      primaryCategory: primary,
      secondaryCategories: secondary,
      visibleCategories,
      hasExplicitPreference: true,
    };
  }

  const allCategoryIds = [...new Set([...(explicitPrimary ? [explicitPrimary] : []), ...explicitSecondary])];
  const primaryCategory = explicitPrimary ?? 'cleaning';
  const secondaryCategories = allCategoryIds.filter((id) => id !== primaryCategory);
  return {
    primaryCategory,
    secondaryCategories,
    visibleCategories: allCategoryIds,
    hasExplicitPreference: Boolean(explicitPrimary || explicitSecondary.length),
  };
}

export function getJobServiceCategoryId(job: Pick<Job, 'category'>): ServiceCategoryId | null {
  return normalizeHelperCategoryId(job.category);
}

export function sortJobsByHelperCategoryPreference<T extends Pick<Job, 'category'>>(
  jobs: T[],
  prefs: HelperCategoryPreferences,
): T[] {
  if (!prefs.hasExplicitPreference) return [...jobs];
  const weight = (job: Pick<Job, 'category'>) => {
    const id = getJobServiceCategoryId(job);
    if (id === prefs.primaryCategory) return 0;
    if (id && prefs.secondaryCategories.includes(id)) return 1;
    return 2;
  };

  return [...jobs].sort((a, b) => weight(a) - weight(b));
}

export function filterToPreferredCategoriesIfPossible<T extends Pick<Job, 'category'>>(
  jobs: T[],
  prefs: HelperCategoryPreferences,
): T[] {
  if (!prefs.hasExplicitPreference) return jobs;
  const preferred = jobs.filter((job) => {
    const id = getJobServiceCategoryId(job);
    return id === prefs.primaryCategory || Boolean(id && prefs.secondaryCategories.includes(id));
  });
  return preferred.length > 0 ? preferred : jobs;
}
