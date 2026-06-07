import type { ServiceCategoryId } from '@/data/serviceCategories';
import { resolveCategoryId } from '@/utils/translateCategory';

export type CategoryAccent = {
  chip: string;
  active: string;
  icon: string;
  glow: string;
  cardBorder: string;
  cardHover: string;
  iconInactive: string;
  filterActive: string;
  filterInactive: string;
};

export type CategoryFeedTheme = {
  iconBg: string;
  iconColor: string;
  dotColor: string;
  budgetColor: string;
  accent: CategoryAccent;
};

const THEMES: Record<ServiceCategoryId, CategoryFeedTheme> = {
  cleaning: {
    iconBg: '#ECFEFF',
    iconColor: '#06B6D4',
    dotColor: '#06B6D4',
    budgetColor: '#0891B2',
    accent: {
      chip: 'from-cyan-500 to-blue-600',
      active: 'border-cyan-300 bg-cyan-50 text-cyan-900',
      icon: 'bg-cyan-500 text-white shadow-cyan-200',
      glow: 'shadow-[0_0_28px_rgba(6,182,212,0.35)]',
      cardBorder: 'border-cyan-200',
      cardHover: 'hover:border-cyan-300 hover:bg-cyan-50/60',
      iconInactive: 'bg-cyan-50 text-cyan-600',
      filterActive: 'border-cyan-400 bg-cyan-600 text-white shadow-[0_10px_22px_rgba(6,182,212,0.28)]',
      filterInactive: 'border-cyan-100 bg-white/88 text-slate-800 hover:border-cyan-200 hover:bg-cyan-50',
    },
  },
  sanitization: {
    iconBg: '#F0FDFA',
    iconColor: '#14B8A6',
    dotColor: '#14B8A6',
    budgetColor: '#0D9488',
    accent: {
      chip: 'from-teal-500 to-emerald-500',
      active: 'border-teal-300 bg-teal-50 text-teal-900',
      icon: 'bg-teal-500 text-white shadow-teal-200',
      glow: 'shadow-[0_0_28px_rgba(20,184,166,0.32)]',
      cardBorder: 'border-teal-200',
      cardHover: 'hover:border-teal-300 hover:bg-teal-50/60',
      iconInactive: 'bg-teal-50 text-teal-600',
      filterActive: 'border-teal-400 bg-teal-600 text-white shadow-[0_10px_22px_rgba(20,184,166,0.28)]',
      filterInactive: 'border-teal-100 bg-white/88 text-slate-800 hover:border-teal-200 hover:bg-teal-50',
    },
  },
  moving: {
    iconBg: '#EFF6FF',
    iconColor: '#2563EB',
    dotColor: '#2563EB',
    budgetColor: '#1D4ED8',
    accent: {
      chip: 'from-blue-600 to-indigo-600',
      active: 'border-blue-300 bg-blue-50 text-blue-900',
      icon: 'bg-blue-600 text-white shadow-blue-200',
      glow: 'shadow-[0_0_28px_rgba(37,99,235,0.35)]',
      cardBorder: 'border-blue-200',
      cardHover: 'hover:border-blue-300 hover:bg-blue-50/60',
      iconInactive: 'bg-blue-50 text-blue-600',
      filterActive: 'border-blue-400 bg-blue-600 text-white shadow-[0_10px_22px_rgba(37,99,235,0.28)]',
      filterInactive: 'border-blue-100 bg-white/88 text-slate-800 hover:border-blue-200 hover:bg-blue-50',
    },
  },
  assembly: {
    iconBg: '#EEF2FF',
    iconColor: '#4F46E5',
    dotColor: '#4F46E5',
    budgetColor: '#4338CA',
    accent: {
      chip: 'from-indigo-500 to-blue-700',
      active: 'border-indigo-300 bg-indigo-50 text-indigo-900',
      icon: 'bg-indigo-600 text-white shadow-indigo-200',
      glow: 'shadow-[0_0_28px_rgba(79,70,229,0.32)]',
      cardBorder: 'border-indigo-200',
      cardHover: 'hover:border-indigo-300 hover:bg-indigo-50/60',
      iconInactive: 'bg-indigo-50 text-indigo-600',
      filterActive: 'border-indigo-400 bg-indigo-600 text-white shadow-[0_10px_22px_rgba(79,70,229,0.28)]',
      filterInactive: 'border-indigo-100 bg-white/88 text-slate-800 hover:border-indigo-200 hover:bg-indigo-50',
    },
  },
  automotive: {
    iconBg: '#FFF7ED',
    iconColor: '#F97316',
    dotColor: '#F97316',
    budgetColor: '#EA580C',
    accent: {
      chip: 'from-orange-500 to-amber-500',
      active: 'border-orange-300 bg-orange-50 text-orange-900',
      icon: 'bg-orange-500 text-white shadow-orange-200',
      glow: 'shadow-[0_0_28px_rgba(249,115,22,0.3)]',
      cardBorder: 'border-orange-200',
      cardHover: 'hover:border-orange-300 hover:bg-orange-50/60',
      iconInactive: 'bg-orange-50 text-orange-600',
      filterActive: 'border-orange-400 bg-orange-500 text-white shadow-[0_10px_22px_rgba(249,115,22,0.28)]',
      filterInactive: 'border-orange-100 bg-white/88 text-slate-800 hover:border-orange-200 hover:bg-orange-50',
    },
  },
  translation: {
    iconBg: '#F5F3FF',
    iconColor: '#7C3AED',
    dotColor: '#7C3AED',
    budgetColor: '#6D28D9',
    accent: {
      chip: 'from-violet-600 to-fuchsia-500',
      active: 'border-violet-300 bg-violet-50 text-violet-900',
      icon: 'bg-violet-600 text-white shadow-violet-200',
      glow: 'shadow-[0_0_28px_rgba(124,58,237,0.32)]',
      cardBorder: 'border-violet-200',
      cardHover: 'hover:border-violet-300 hover:bg-violet-50/60',
      iconInactive: 'bg-violet-50 text-violet-600',
      filterActive: 'border-violet-400 bg-violet-600 text-white shadow-[0_10px_22px_rgba(124,58,237,0.28)]',
      filterInactive: 'border-violet-100 bg-white/88 text-slate-800 hover:border-violet-200 hover:bg-violet-50',
    },
  },
  beauty: {
    iconBg: '#FDF2F8',
    iconColor: '#DB2777',
    dotColor: '#DB2777',
    budgetColor: '#BE185D',
    accent: {
      chip: 'from-pink-500 to-rose-500',
      active: 'border-pink-300 bg-pink-50 text-pink-900',
      icon: 'bg-pink-500 text-white shadow-pink-200',
      glow: 'shadow-[0_0_28px_rgba(236,72,153,0.28)]',
      cardBorder: 'border-pink-200',
      cardHover: 'hover:border-pink-300 hover:bg-pink-50/60',
      iconInactive: 'bg-pink-50 text-pink-600',
      filterActive: 'border-pink-400 bg-pink-500 text-white shadow-[0_10px_22px_rgba(236,72,153,0.28)]',
      filterInactive: 'border-pink-100 bg-white/88 text-slate-800 hover:border-pink-200 hover:bg-pink-50',
    },
  },
  renovation: {
    iconBg: '#F8FAFC',
    iconColor: '#475569',
    dotColor: '#475569',
    budgetColor: '#334155',
    accent: {
      chip: 'from-slate-700 to-blue-700',
      active: 'border-slate-300 bg-slate-50 text-slate-900',
      icon: 'bg-slate-800 text-white shadow-slate-200',
      glow: 'shadow-[0_0_28px_rgba(30,64,175,0.25)]',
      cardBorder: 'border-slate-300',
      cardHover: 'hover:border-slate-400 hover:bg-slate-50/80',
      iconInactive: 'bg-slate-100 text-slate-600',
      filterActive: 'border-slate-400 bg-slate-700 text-white shadow-[0_10px_22px_rgba(51,65,85,0.28)]',
      filterInactive: 'border-slate-200 bg-white/88 text-slate-800 hover:border-slate-300 hover:bg-slate-50',
    },
  },
  outdoor: {
    iconBg: '#ECFDF5',
    iconColor: '#059669',
    dotColor: '#059669',
    budgetColor: '#047857',
    accent: {
      chip: 'from-emerald-500 to-teal-500',
      active: 'border-emerald-300 bg-emerald-50 text-emerald-900',
      icon: 'bg-emerald-500 text-white shadow-emerald-200',
      glow: 'shadow-[0_0_28px_rgba(16,185,129,0.28)]',
      cardBorder: 'border-emerald-200',
      cardHover: 'hover:border-emerald-300 hover:bg-emerald-50/60',
      iconInactive: 'bg-emerald-50 text-emerald-600',
      filterActive: 'border-emerald-400 bg-emerald-600 text-white shadow-[0_10px_22px_rgba(16,185,129,0.28)]',
      filterInactive: 'border-emerald-100 bg-white/88 text-slate-800 hover:border-emerald-200 hover:bg-emerald-50',
    },
  },
  pet: {
    iconBg: '#FFFBEB',
    iconColor: '#D97706',
    dotColor: '#D97706',
    budgetColor: '#B45309',
    accent: {
      chip: 'from-amber-500 to-yellow-500',
      active: 'border-amber-300 bg-amber-50 text-amber-900',
      icon: 'bg-amber-500 text-white shadow-amber-200',
      glow: 'shadow-[0_0_28px_rgba(245,158,11,0.28)]',
      cardBorder: 'border-amber-200',
      cardHover: 'hover:border-amber-300 hover:bg-amber-50/60',
      iconInactive: 'bg-amber-50 text-amber-600',
      filterActive: 'border-amber-400 bg-amber-500 text-white shadow-[0_10px_22px_rgba(245,158,11,0.28)]',
      filterInactive: 'border-amber-100 bg-white/88 text-slate-800 hover:border-amber-200 hover:bg-amber-50',
    },
  },
  tech: {
    iconBg: '#EEF2FF',
    iconColor: '#4338CA',
    dotColor: '#4338CA',
    budgetColor: '#3730A3',
    accent: {
      chip: 'from-indigo-600 to-violet-700',
      active: 'border-indigo-300 bg-indigo-50 text-indigo-900',
      icon: 'bg-indigo-700 text-white shadow-indigo-200',
      glow: 'shadow-[0_0_28px_rgba(67,56,202,0.3)]',
      cardBorder: 'border-indigo-200',
      cardHover: 'hover:border-indigo-300 hover:bg-indigo-50/60',
      iconInactive: 'bg-indigo-50 text-indigo-700',
      filterActive: 'border-indigo-400 bg-indigo-700 text-white shadow-[0_10px_22px_rgba(67,56,202,0.28)]',
      filterInactive: 'border-indigo-100 bg-white/88 text-slate-800 hover:border-indigo-200 hover:bg-indigo-50',
    },
  },
  design: {
    iconBg: '#FDF4FF',
    iconColor: '#C026D3',
    dotColor: '#C026D3',
    budgetColor: '#A21CAF',
    accent: {
      chip: 'from-fuchsia-500 to-purple-600',
      active: 'border-fuchsia-300 bg-fuchsia-50 text-fuchsia-900',
      icon: 'bg-fuchsia-600 text-white shadow-fuchsia-200',
      glow: 'shadow-[0_0_28px_rgba(192,38,211,0.3)]',
      cardBorder: 'border-fuchsia-200',
      cardHover: 'hover:border-fuchsia-300 hover:bg-fuchsia-50/60',
      iconInactive: 'bg-fuchsia-50 text-fuchsia-600',
      filterActive: 'border-fuchsia-400 bg-fuchsia-600 text-white shadow-[0_10px_22px_rgba(192,38,211,0.28)]',
      filterInactive: 'border-fuchsia-100 bg-white/88 text-slate-800 hover:border-fuchsia-200 hover:bg-fuchsia-50',
    },
  },
  marketing: {
    iconBg: '#FFF1F2',
    iconColor: '#E11D48',
    dotColor: '#E11D48',
    budgetColor: '#BE123C',
    accent: {
      chip: 'from-rose-500 to-red-600',
      active: 'border-rose-300 bg-rose-50 text-rose-900',
      icon: 'bg-rose-600 text-white shadow-rose-200',
      glow: 'shadow-[0_0_28px_rgba(225,29,72,0.28)]',
      cardBorder: 'border-rose-200',
      cardHover: 'hover:border-rose-300 hover:bg-rose-50/60',
      iconInactive: 'bg-rose-50 text-rose-600',
      filterActive: 'border-rose-400 bg-rose-600 text-white shadow-[0_10px_22px_rgba(225,29,72,0.28)]',
      filterInactive: 'border-rose-100 bg-white/88 text-slate-800 hover:border-rose-200 hover:bg-rose-50',
    },
  },
  other: {
    iconBg: '#F1F5F9',
    iconColor: '#64748B',
    dotColor: '#64748B',
    budgetColor: '#475569',
    accent: {
      chip: 'from-slate-500 to-sky-600',
      active: 'border-slate-300 bg-slate-50 text-slate-800',
      icon: 'bg-slate-500 text-white shadow-slate-200',
      glow: 'shadow-[0_0_28px_rgba(100,116,139,0.25)]',
      cardBorder: 'border-slate-200',
      cardHover: 'hover:border-slate-300 hover:bg-slate-50/80',
      iconInactive: 'bg-slate-100 text-slate-500',
      filterActive: 'border-slate-400 bg-slate-500 text-white shadow-[0_10px_22px_rgba(100,116,139,0.28)]',
      filterInactive: 'border-slate-200 bg-white/88 text-slate-800 hover:border-slate-300 hover:bg-slate-50',
    },
  },
};

const DEFAULT_THEME = THEMES.other;

export const HELPER_CATEGORY_ACCENTS = Object.fromEntries(
  Object.entries(THEMES).map(([id, theme]) => [id, theme.accent]),
) as Record<ServiceCategoryId, CategoryAccent>;

function resolveThemeId(categoryRaw: string): ServiceCategoryId {
  const id = resolveCategoryId(categoryRaw);
  if (id && id in THEMES) return id as ServiceCategoryId;
  return 'other';
}

export function getCategoryFeedTheme(categoryRaw: string): CategoryFeedTheme {
  return THEMES[resolveThemeId(categoryRaw)];
}

export function getCategoryAccent(categoryRaw: string): CategoryAccent {
  return getCategoryFeedTheme(categoryRaw).accent;
}
