/**
 * Internal publish compatibility when the client no longer picks a subcategory UI.
 *
 * Staging / baseline finance (`lead_validate_service_mode`) still requires an
 * official subcategory id. Helper lead LC quotes remain category-level; this map
 * only preserves modality policy + budget suggestion coherence.
 *
 * Selection rules (deterministic, not array[0]):
 * - Prefer a subcategory with service_mode policy `both` when the category has one,
 *   so the client can still choose remote vs in-person.
 * - Otherwise pick a representative mid-range / generic official sub that matches
 *   market budget `default` bands (e.g. cleaning → apartment, moving → small_moves).
 * - Never invent prices; never use helper_skills defaults.
 */
import {
  isOfficialServiceCategoryId,
  isOfficialServiceSubcategory,
  type ServiceCategoryId,
} from '@/data/serviceCategories';
import { getServiceModePolicy } from '@/config/serviceModePolicy';

export const DEFAULT_SUBCATEGORY_BY_CATEGORY: Record<ServiceCategoryId, string> = {
  cleaning: 'apartment',
  sanitization: 'sofa',
  moving: 'small_moves',
  assembly: 'ikea',
  automotive: 'battery',
  translation: 'government',
  beauty: 'nails',
  renovation: 'small_repairs',
  outdoor: 'garden',
  pet: 'walk',
  tech: 'format',
  design: 'print',
  marketing: 'branding',
  other: 'other',
};

export function getDefaultSubcategoryForCategory(
  categoryId: string | null | undefined,
): string | null {
  const cat = (categoryId ?? '').trim();
  if (!isOfficialServiceCategoryId(cat)) return null;
  const sub = DEFAULT_SUBCATEGORY_BY_CATEGORY[cat];
  if (!isOfficialServiceSubcategory(cat, sub)) return null;
  return sub;
}

/** Ensures every default is official and policy-resolvable (for tests). */
export function assertDefaultSubcategoryMapIntegrity(): {
  ok: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  for (const [cat, sub] of Object.entries(DEFAULT_SUBCATEGORY_BY_CATEGORY)) {
    if (!isOfficialServiceSubcategory(cat, sub)) {
      issues.push(`${cat}:${sub} is not an official subcategory`);
      continue;
    }
    // Touch policy resolver — must not throw.
    void getServiceModePolicy(cat, sub);
  }
  return { ok: issues.length === 0, issues };
}
