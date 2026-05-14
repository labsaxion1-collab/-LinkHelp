/** Landing tiles — labels from `t(\`categories.${id}\`)` where ids exist in i18n */
export const landingCategories = [
  { id: 'cleaning', icon: 'Sparkles' },
  { id: 'moving', icon: 'Truck' },
  { id: 'assembly', icon: 'Hammer' },
  { id: 'translation', icon: 'Languages' },
  { id: 'renovation', icon: 'Wrench' },
  { id: 'outdoor', icon: 'TreePine' },
  { id: 'pet', icon: 'Dog' },
  { id: 'tech', icon: 'Monitor' },
  { id: 'beauty', icon: 'Smile' },
  { id: 'cooking', icon: 'ChefHat' },
] as const;

/** @deprecated Use `landingCategories` */
export const categories = landingCategories;
