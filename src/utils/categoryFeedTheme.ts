import { resolveCategoryId } from '@/utils/translateCategory';

export type CategoryFeedTheme = {
  iconBg: string;
  iconColor: string;
  dotColor: string;
  budgetColor: string;
};

const THEMES: Record<string, CategoryFeedTheme> = {
  automotive: {
    iconBg: '#EFF6FF',
    iconColor: '#2563EB',
    dotColor: '#2563EB',
    budgetColor: '#2563EB',
  },
  sanitization: {
    iconBg: '#ECFDF5',
    iconColor: '#16A34A',
    dotColor: '#16A34A',
    budgetColor: '#16A34A',
  },
  cleaning: {
    iconBg: '#ECFDF5',
    iconColor: '#16A34A',
    dotColor: '#16A34A',
    budgetColor: '#16A34A',
  },
  translation: {
    iconBg: '#F5F3FF',
    iconColor: '#7C3AED',
    dotColor: '#7C3AED',
    budgetColor: '#7C3AED',
  },
  beauty: {
    iconBg: '#FDF2F8',
    iconColor: '#DB2777',
    dotColor: '#DB2777',
    budgetColor: '#DB2777',
  },
  outdoor: {
    iconBg: '#ECFDF5',
    iconColor: '#059669',
    dotColor: '#059669',
    budgetColor: '#059669',
  },
};

const DEFAULT_THEME: CategoryFeedTheme = {
  iconBg: '#EFF6FF',
  iconColor: '#2563EB',
  dotColor: '#2563EB',
  budgetColor: '#2563EB',
};

export function getCategoryFeedTheme(categoryRaw: string): CategoryFeedTheme {
  const id = resolveCategoryId(categoryRaw) || categoryRaw;
  return THEMES[id] ?? DEFAULT_THEME;
}
