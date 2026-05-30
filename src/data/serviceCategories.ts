/**
 * Main categories for the client create-request flow.
 * Labels: `t(\`categories.${id}\`)`. Quick subs: `t(\`service_subs.${id}.${subKey}\`)`.
 */
export const SERVICE_CATEGORIES = [
  {
    id: 'cleaning',
    icon: 'Sparkles',
    subKeys: ['apartment', 'house', 'commercial', 'post_construction', 'moving_clean', 'windows'],
  },
  {
    id: 'sanitization',
    icon: 'SprayCan',
    subKeys: ['sofa', 'mattress', 'car', 'carpet'],
  },
  {
    id: 'moving',
    icon: 'Truck',
    subKeys: [
      'houses',
      'apartments',
      'condominium',
      'offices',
      'office_building',
      'companies',
      'furniture_transport',
      'assembly_disassembly',
      'packing',
      'loading',
      'unloading',
      'local_move',
      'long_distance',
      'small_moves',
      'express_freight',
      'appliances_transport',
    ],
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
    subKeys: [
      'nails',
      'nail_extensions',
      'barber',
      'hairdresser',
      'body_massage',
      'facial_cleansing',
      'brows',
      'waxing',
      'lashes',
    ],
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
    id: 'tech',
    icon: 'Monitor',
    subKeys: ['format', 'printer', 'wifi', 'slow_pc', 'install', 'tv', 'phone'],
  },
] as const;

export type ServiceCategoryId = (typeof SERVICE_CATEGORIES)[number]['id'];
