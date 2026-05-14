/**
 * Main categories for the client create-request flow.
 * Labels: `t(\`categories.${id}\`)`. Quick subs: `t(\`service_subs.${id}.${subKey}\`)`.
 */
export const SERVICE_CATEGORIES = [
  {
    id: 'cleaning',
    icon: 'Sparkles',
    subKeys: ['apartment', 'house', 'commercial', 'post_construction', 'moving_clean', 'windows', 'deep'],
  },
  {
    id: 'moving',
    icon: 'Truck',
    subKeys: ['residential', 'small_delivery', 'furniture_pickup', 'large_items', 'urgent'],
  },
  {
    id: 'assembly',
    icon: 'Hammer',
    subKeys: ['ikea', 'wardrobe', 'bed', 'table', 'desk', 'tv_mount', 'curtains', 'wall_mount'],
  },
  { id: 'automotive', icon: 'Car', subKeys: ['tire', 'battery', 'jump_start', 'wont_start'] },
  {
    id: 'translation',
    icon: 'Languages',
    subKeys: ['government', 'school', 'college', 'interview', 'document', 'consultation', 'immigration'],
  },
  {
    id: 'beauty',
    icon: 'Smile',
    subKeys: ['manicure', 'pedicure', 'hair', 'barber', 'makeup', 'lashes', 'brows'],
  },
  {
    id: 'renovation',
    icon: 'Wrench',
    subKeys: ['plumbing', 'leak', 'clogged', 'shower', 'painting', 'roof', 'drywall', 'small_repairs'],
  },
  {
    id: 'outdoor',
    icon: 'TreePine',
    subKeys: ['snow', 'lawn', 'garden', 'leaves', 'fence', 'exterior_clean'],
  },
  {
    id: 'pet',
    icon: 'Dog',
    subKeys: ['walk', 'bath', 'sitter', 'boarding', 'daily_visit', 'feeding', 'travel_care'],
  },
  {
    id: 'cooking',
    icon: 'ChefHat',
    subKeys: ['meal_boxes', 'cook', 'events', 'bbq', 'weekly_meals'],
  },
  {
    id: 'tech',
    icon: 'Monitor',
    subKeys: ['format', 'printer', 'wifi', 'slow_pc', 'install', 'tv', 'phone'],
  },
] as const;

export type ServiceCategoryId = (typeof SERVICE_CATEGORIES)[number]['id'];
