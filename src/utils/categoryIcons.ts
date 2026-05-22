import type { LucideIcon } from 'lucide-react';
import * as Icons from 'lucide-react';
import { SERVICE_CATEGORIES, type ServiceCategoryId } from '@/data/serviceCategories';

const iconByCategoryId = Object.fromEntries(
  SERVICE_CATEGORIES.map((c) => [c.id, c.icon]),
) as Record<ServiceCategoryId, string>;

export function getCategoryLucideIcon(iconName: string): LucideIcon {
  const Icon = (Icons as Record<string, LucideIcon | undefined>)[iconName];
  return Icon ?? Icons.HelpCircle;
}

export function getCategoryIconById(categoryId: string): LucideIcon {
  const iconName = iconByCategoryId[categoryId as ServiceCategoryId];
  return getCategoryLucideIcon(iconName ?? 'HelpCircle');
}
