import type { ServiceCategoryId } from '@/data/serviceCategories';
import {
  REQUEST_CATEGORY_GROUPS,
  type RequestCategoryGroupId,
} from '@/data/requestCategoryGroups';

export const HELPER_CATEGORY_GROUPS = REQUEST_CATEGORY_GROUPS.filter((group) => group.id !== 'other');

export type HelperCategoryGroupId = Exclude<RequestCategoryGroupId, 'other'>;

export function helperCategoryGroupIdsFromCategories(
  categories: readonly ServiceCategoryId[],
): HelperCategoryGroupId[] {
  const selected = new Set(categories);
  return HELPER_CATEGORY_GROUPS.filter((group) =>
    group.categories.some((category) => selected.has(category)),
  ).map((group) => group.id);
}

export function toggleHelperCategoryGroup(
  current: readonly ServiceCategoryId[],
  groupId: HelperCategoryGroupId,
): ServiceCategoryId[] {
  const group = HELPER_CATEGORY_GROUPS.find((candidate) => candidate.id === groupId);
  if (!group) return [...current];
  const groupCategories = new Set<ServiceCategoryId>(group.categories);
  const hasSelection = current.some((category) => groupCategories.has(category));
  if (hasSelection) {
    const next = current.filter((category) => !groupCategories.has(category));
    return next.length > 0 ? next : [...current];
  }
  return [...current, ...group.categories.filter((category) => !current.includes(category))];
}

export function removeHelperCategoryGroup(
  current: readonly ServiceCategoryId[],
  groupId: HelperCategoryGroupId,
): ServiceCategoryId[] {
  const group = HELPER_CATEGORY_GROUPS.find((candidate) => candidate.id === groupId);
  if (!group) return [...current];
  const groupCategories = new Set<ServiceCategoryId>(group.categories);
  const next = current.filter((category) => !groupCategories.has(category));
  return next.length > 0 ? next : [...current];
}
