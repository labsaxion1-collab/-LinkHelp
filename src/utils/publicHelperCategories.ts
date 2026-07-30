import {
  SERVICE_CATEGORIES,
  isOfficialServiceCategoryId,
  type ServiceCategoryId,
} from '@/data/serviceCategories';
import { skillKey } from '@/data/helperSkillsCatalog';

/**
 * Ordered selection: index 0 is always primary_category; the rest map to secondary_categories.
 * No artificial count cap — limited only by official SERVICE_CATEGORIES catalog.
 */
export function normalizePublicHelperCategorySelection(
  primaryRaw: string | null | undefined,
  secondaryRaw: string[] | null | undefined,
): ServiceCategoryId[] {
  const primary = isOfficialServiceCategoryId(primaryRaw) ? primaryRaw : null;
  const secondary = (Array.isArray(secondaryRaw) ? secondaryRaw : [])
    .filter(isOfficialServiceCategoryId)
    .filter((id) => id !== primary);
  const uniqueSecondary = [...new Set(secondary)];
  if (primary) return [primary, ...uniqueSecondary];
  if (uniqueSecondary.length > 0) return uniqueSecondary;
  return [SERVICE_CATEGORIES[0].id];
}

export function addPublicHelperCategory(
  current: ServiceCategoryId[],
  next: ServiceCategoryId,
): ServiceCategoryId[] {
  if (!isOfficialServiceCategoryId(next)) return current;
  if (current.includes(next)) return current;
  return [...current, next];
}

/** Toggle category in a draft multi-select (keeps order; first remains primary). */
export function togglePublicHelperCategoryDraft(
  current: ServiceCategoryId[],
  id: ServiceCategoryId,
): ServiceCategoryId[] {
  if (!isOfficialServiceCategoryId(id)) return current;
  if (current.includes(id)) {
    if (current.length <= 1) return current;
    return current.filter((x) => x !== id);
  }
  return [...current, id];
}

/** Never drops below one category; removing primary promotes the next item. */
export function removePublicHelperCategory(
  current: ServiceCategoryId[],
  removeId: ServiceCategoryId,
): ServiceCategoryId[] {
  if (current.length <= 1) return current;
  return current.filter((id) => id !== removeId);
}

export function splitPublicHelperCategories(selected: ServiceCategoryId[]): {
  primary: ServiceCategoryId;
  additional: ServiceCategoryId[];
} {
  const normalized =
    selected.length > 0
      ? [...new Set(selected.filter(isOfficialServiceCategoryId))]
      : [SERVICE_CATEGORIES[0].id];
  return {
    primary: normalized[0],
    additional: normalized.slice(1),
  };
}

/**
 * Minimal helper_skills rows so feed/skill gates derive the same service categories.
 * Uses the first official subcategory per category (jobs match on primary category id).
 */
export function defaultSkillKeysForServiceCategories(ids: ServiceCategoryId[]): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (!isOfficialServiceCategoryId(id) || seen.has(id)) continue;
    seen.add(id);
    const cat = SERVICE_CATEGORIES.find((c) => c.id === id);
    const firstSub = cat?.subKeys?.[0];
    if (firstSub) keys.push(skillKey(id, firstSub));
  }
  return keys;
}
