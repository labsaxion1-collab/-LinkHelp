import { SERVICE_CATEGORIES, type ServiceCategoryId } from '@/data/serviceCategories';
import { resolveCategoryId, slugifyLabel } from '@/utils/translateCategory';

/** Navigation only. Never persist these IDs in requests or helper skills. */
export const REQUEST_CATEGORY_GROUPS = [
  { id: 'cleaning', icon: 'Sparkles', categories: ['cleaning', 'sanitization'] },
  { id: 'repairs', icon: 'Wrench', categories: ['assembly', 'renovation'] },
  { id: 'moving', icon: 'Truck', categories: ['moving'] },
  { id: 'home_outdoor', icon: 'TreePine', categories: ['outdoor'] },
  { id: 'automotive', icon: 'Car', categories: ['automotive'] },
  { id: 'pets', icon: 'Dog', categories: ['pet'] },
  { id: 'digital', icon: 'Monitor', categories: ['tech', 'design', 'marketing'] },
  { id: 'personal', icon: 'Smile', categories: ['beauty', 'translation'] },
  { id: 'other', icon: 'CircleHelp', categories: ['other'] },
] as const satisfies readonly { id: string; icon: string; categories: readonly ServiceCategoryId[] }[];

export type RequestCategoryGroupId = (typeof REQUEST_CATEGORY_GROUPS)[number]['id'];

export function isRequestCategoryGroupId(value: unknown): value is RequestCategoryGroupId {
  return REQUEST_CATEGORY_GROUPS.some((group) => group.id === value);
}

/** Legacy records need no backfill. Unknown values are only grouped visually. */
export function getRequestCategoryGroup(category: string | null | undefined): RequestCategoryGroupId {
  const displayAliases: Record<string, ServiceCategoryId> = {
    estetica_e_beleza: 'beauty', jardinagem_e_area_externa: 'outdoor',
    gardening_outdoor: 'outdoor', jardinage_et_espaces_exterieurs: 'outdoor',
    suporte_em_ti: 'tech',
  };
  const resolved = resolveCategoryId(category ?? '') ?? displayAliases[slugifyLabel(category ?? '')];
  const legacy: Record<string, string> = {
    furniture: 'assembly', delivery: 'moving', gardening: 'outdoor', snow: 'outdoor',
    home: 'cleaning', interpretation: 'translation',
  };
  const id = legacy[resolved ?? ''] ?? resolved;
  return REQUEST_CATEGORY_GROUPS.find((group) => (group.categories as readonly string[]).includes(id ?? ''))?.id ?? 'other';
}

export function getRequestGroupCategories(groupId: RequestCategoryGroupId) {
  const group = REQUEST_CATEGORY_GROUPS.find((item) => item.id === groupId)!;
  return group.categories.map((id) => SERVICE_CATEGORIES.find((category) => category.id === id)!);
}
