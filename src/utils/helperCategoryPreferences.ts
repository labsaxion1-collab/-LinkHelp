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

export const HELPER_CATEGORY_ACCENTS: Record<
  ServiceCategoryId,
  { chip: string; active: string; icon: string; glow: string }
> = {
  cleaning: {
    chip: 'from-cyan-500 to-blue-600',
    active: 'border-cyan-300 bg-cyan-50 text-cyan-900',
    icon: 'bg-cyan-500 text-white shadow-cyan-200',
    glow: 'shadow-[0_0_28px_rgba(6,182,212,0.35)]',
  },
  sanitization: {
    chip: 'from-sky-500 to-cyan-500',
    active: 'border-sky-300 bg-sky-50 text-sky-900',
    icon: 'bg-sky-500 text-white shadow-sky-200',
    glow: 'shadow-[0_0_28px_rgba(14,165,233,0.32)]',
  },
  moving: {
    chip: 'from-blue-600 to-indigo-600',
    active: 'border-blue-300 bg-blue-50 text-blue-900',
    icon: 'bg-blue-600 text-white shadow-blue-200',
    glow: 'shadow-[0_0_28px_rgba(37,99,235,0.35)]',
  },
  assembly: {
    chip: 'from-indigo-500 to-blue-700',
    active: 'border-indigo-300 bg-indigo-50 text-indigo-900',
    icon: 'bg-indigo-600 text-white shadow-indigo-200',
    glow: 'shadow-[0_0_28px_rgba(79,70,229,0.32)]',
  },
  automotive: {
    chip: 'from-orange-500 to-amber-500',
    active: 'border-orange-300 bg-orange-50 text-orange-900',
    icon: 'bg-orange-500 text-white shadow-orange-200',
    glow: 'shadow-[0_0_28px_rgba(249,115,22,0.3)]',
  },
  translation: {
    chip: 'from-violet-600 to-fuchsia-500',
    active: 'border-violet-300 bg-violet-50 text-violet-900',
    icon: 'bg-violet-600 text-white shadow-violet-200',
    glow: 'shadow-[0_0_28px_rgba(124,58,237,0.32)]',
  },
  beauty: {
    chip: 'from-pink-500 to-rose-500',
    active: 'border-pink-300 bg-pink-50 text-pink-900',
    icon: 'bg-pink-500 text-white shadow-pink-200',
    glow: 'shadow-[0_0_28px_rgba(236,72,153,0.28)]',
  },
  renovation: {
    chip: 'from-slate-700 to-blue-700',
    active: 'border-slate-300 bg-slate-50 text-slate-900',
    icon: 'bg-slate-800 text-white shadow-slate-200',
    glow: 'shadow-[0_0_28px_rgba(30,64,175,0.25)]',
  },
  outdoor: {
    chip: 'from-emerald-500 to-teal-500',
    active: 'border-emerald-300 bg-emerald-50 text-emerald-900',
    icon: 'bg-emerald-500 text-white shadow-emerald-200',
    glow: 'shadow-[0_0_28px_rgba(16,185,129,0.28)]',
  },
  pet: {
    chip: 'from-amber-500 to-yellow-500',
    active: 'border-amber-300 bg-amber-50 text-amber-900',
    icon: 'bg-amber-500 text-white shadow-amber-200',
    glow: 'shadow-[0_0_28px_rgba(245,158,11,0.28)]',
  },
  cooking: {
    chip: 'from-rose-500 to-orange-500',
    active: 'border-rose-300 bg-rose-50 text-rose-900',
    icon: 'bg-rose-500 text-white shadow-rose-200',
    glow: 'shadow-[0_0_28px_rgba(244,63,94,0.25)]',
  },
  tech: {
    chip: 'from-blue-500 to-slate-700',
    active: 'border-blue-300 bg-blue-50 text-blue-900',
    icon: 'bg-blue-600 text-white shadow-blue-200',
    glow: 'shadow-[0_0_28px_rgba(21,101,255,0.3)]',
  },
};

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
  cozinha: 'cooking',
  culinaria: 'cooking',
  suporte_em_ti: 'tech',
  informatica: 'tech',
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
