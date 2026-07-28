import {
  SERVICE_CATEGORIES,
  isOfficialServiceCategoryId,
  type ServiceCategoryId,
} from '@/data/serviceCategories';

/** 1 primary + up to 2 additional — public edit UX only. */
export const MAX_PUBLIC_HELPER_CATEGORIES = 3;
export const MAX_PUBLIC_HELPER_ADDITIONAL = 2;

/**
 * Ordered selection: index 0 is always primary_category; the rest map to secondary_categories.
 */
export function normalizePublicHelperCategorySelection(
  primaryRaw: string | null | undefined,
  secondaryRaw: string[] | null | undefined,
): ServiceCategoryId[] {
  const primary = isOfficialServiceCategoryId(primaryRaw) ? primaryRaw : null;
  const secondary = (Array.isArray(secondaryRaw) ? secondaryRaw : [])
    .filter(isOfficialServiceCategoryId)
    .filter((id) => id !== primary);
  const uniqueSecondary = [...new Set(secondary)].slice(0, MAX_PUBLIC_HELPER_ADDITIONAL);
  if (primary) return [primary, ...uniqueSecondary];
  if (uniqueSecondary.length > 0) return uniqueSecondary.slice(0, MAX_PUBLIC_HELPER_CATEGORIES);
  return [SERVICE_CATEGORIES[0].id];
}

export function addPublicHelperCategory(
  current: ServiceCategoryId[],
  next: ServiceCategoryId,
): ServiceCategoryId[] {
  if (!isOfficialServiceCategoryId(next)) return current;
  if (current.includes(next)) return current;
  if (current.length >= MAX_PUBLIC_HELPER_CATEGORIES) return current;
  return [...current, next];
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
      ? [...new Set(selected.filter(isOfficialServiceCategoryId))].slice(0, MAX_PUBLIC_HELPER_CATEGORIES)
      : [SERVICE_CATEGORIES[0].id];
  return {
    primary: normalized[0],
    additional: normalized.slice(1, MAX_PUBLIC_HELPER_CATEGORIES),
  };
}
