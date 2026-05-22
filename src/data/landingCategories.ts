import { SERVICE_CATEGORIES } from '@/data/serviceCategories';

/** Landing tiles — labels from `t(\`categories.${id}\`)` where ids exist in i18n */
export const landingCategories = SERVICE_CATEGORIES.map(({ id, icon }) => ({ id, icon }));

/** @deprecated Use `landingCategories` */
export const categories = landingCategories;
