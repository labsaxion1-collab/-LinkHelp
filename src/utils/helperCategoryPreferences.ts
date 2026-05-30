import { SERVICE_CATEGORIES, type ServiceCategoryId } from '@/data/serviceCategories';
import { parseSkillKey } from '@/data/helperSkillsCatalog';
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
  tech: {
    chip: 'from-blue-500 to-slate-700',
    active: 'border-blue-300 bg-blue-50 text-blue-900',
    icon: 'bg-blue-600 text-white shadow-blue-200',
    glow: 'shadow-[0_0_28px_rgba(21,101,255,0.3)]',
  },
};

const SERVICE_ID_SET = new Set<string>(SERVICE_CATEGORIES.map((c) => c.id));

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
  const resolved = resolveCategoryId(raw) ?? raw;
  return SERVICE_ID_SET.has(resolved) ? (resolved as ServiceCategoryId) : null;
}

export function categoryIdsFromSkillKeys(skillIds: string[]): ServiceCategoryId[] {
  const seen = new Set<ServiceCategoryId>();
  for (const key of skillIds) {
    const parsed = parseSkillKey(key);
    const mapped = parsed ? SKILL_PRIMARY_TO_SERVICE[parsed.primary] : null;
    if (mapped) seen.add(mapped);
  }
  return [...seen];
}

export function getHelperCategoryPreferences(
  profile: ProfileCategoryFields | null | undefined,
  skillIds: string[] = [],
): HelperCategoryPreferences {
  const fromSkills = categoryIdsFromSkillKeys(skillIds);
  const explicitPrimary = normalizeHelperCategoryId(profile?.primary_category);
  const rawSecondary = Array.isArray(profile?.secondary_categories) ? profile.secondary_categories : [];
  const explicitSecondary = rawSecondary
    .map((id) => normalizeHelperCategoryId(id))
    .filter((id): id is ServiceCategoryId => Boolean(id));
  const primaryCategory = explicitPrimary ?? fromSkills[0] ?? 'cleaning';
  const secondaryCategories = [...new Set([...explicitSecondary, ...fromSkills])]
    .filter((id) => id !== primaryCategory)
    .slice(0, 5);
  return {
    primaryCategory,
    secondaryCategories,
    visibleCategories: [primaryCategory, ...secondaryCategories],
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
  const preferred = jobs.filter((job) => {
    const id = getJobServiceCategoryId(job);
    return id === prefs.primaryCategory || Boolean(id && prefs.secondaryCategories.includes(id));
  });
  return preferred.length > 0 ? preferred : jobs;
}
