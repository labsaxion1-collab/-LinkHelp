/**
 * Helper skills — primary category + subcategory (stored as `primary:sub` keys).
 * Synced to `helper_skills` (category, subcategory) in Supabase.
 */

export type HelperSkillPrimaryId =
  | 'electrical'
  | 'plumbing'
  | 'sanitization'
  | 'general_services'
  | 'cleaning'
  | 'beauty'
  | 'moving'
  | 'automotive';

export type HelperSkillCatalogEntry = {
  readonly id: HelperSkillPrimaryId;
  readonly subs: readonly string[];
};

export const HELPER_SKILLS_CATALOG: readonly HelperSkillCatalogEntry[] = [
  {
    id: 'electrical',
    subs: [
      'outlets',
      'switches',
      'light_fixtures',
      'ceiling_fan',
      'breakers',
      'electrical_panel',
      'short_circuit',
      'wiring',
      'bulb_replacement',
      'led_install',
      'electric_shower',
    ],
  },
  {
    id: 'plumbing',
    subs: [
      'plumbing_general',
      'leaks',
      'sinks',
      'faucets',
      'sewage',
      'flush',
      'showers',
      'broken_pipe',
      'toilet_install',
      'unclogging',
      'water_tank',
      'washing_machine_hookup',
    ],
  },
  {
    id: 'sanitization',
    subs: [
      'sofas',
      'carpets',
      'mattresses',
      'pillows',
      'car_seats',
      'car_interior',
      'rugs',
      'chairs',
      'odor_removal',
      'deep_cleaning',
    ],
  },
  {
    id: 'general_services',
    subs: [
      'snow_removal',
      'gardening',
      'lawn_mowing',
      'door_repairs',
      'window_repairs',
      'furniture_assembly',
      'small_repairs',
      'shelf_install',
      'lock_replacement',
      'junk_removal',
    ],
  },
  {
    id: 'cleaning',
    subs: [
      'houses',
      'apartments',
      'offices',
      'party_hall',
      'pools',
      'heavy_cleaning',
      'post_construction',
      'commercial',
      'residential',
      'windows',
      'airbnb',
      'condominiums',
    ],
  },
  {
    id: 'beauty',
    subs: [
      'manicure',
      'pedicure',
      'hair',
      'brows',
      'makeup',
      'blowout',
      'beard',
      'mens_cut',
      'womens_cut',
      'nail_extensions',
      'lashes',
    ],
  },
  {
    id: 'moving',
    subs: [
      'houses',
      'apartments',
      'offices',
      'companies',
      'furniture_transport',
      'assembly_disassembly',
      'packing',
      'loading',
      'unloading',
      'local_move',
      'small_moves',
      'express_freight',
      'appliances_transport',
    ],
  },
  {
    id: 'automotive',
    subs: [
      'tire_change',
      'roadside_assistance',
      'dead_battery',
      'parts_replacement',
      'oil_change',
      'diagnostics',
      'car_wash',
      'interior_sanitization',
      'polishing',
      'accessories_install',
      'electrical_failure',
      'headlight_replacement',
    ],
  },
] as const;

const PRIMARY_SET = new Set(HELPER_SKILLS_CATALOG.map((c) => c.id));
const VALID_KEYS = new Set<string>();

for (const cat of HELPER_SKILLS_CATALOG) {
  for (const sub of cat.subs) {
    VALID_KEYS.add(skillKey(cat.id, sub));
  }
}

export function skillKey(primary: string, sub: string): string {
  return `${primary}:${sub}`;
}

export function parseSkillKey(key: string): { primary: string; sub: string } | null {
  const i = key.indexOf(':');
  if (i <= 0 || i >= key.length - 1) return null;
  const primary = key.slice(0, i);
  const sub = key.slice(i + 1);
  if (!PRIMARY_SET.has(primary as HelperSkillPrimaryId)) return null;
  const cat = HELPER_SKILLS_CATALOG.find((c) => c.id === primary);
  if (!cat || !(cat.subs as readonly string[]).includes(sub)) return null;
  return { primary, sub };
}

export function isValidSkillKey(key: string): boolean {
  return VALID_KEYS.has(key);
}

export function filterValidSkillKeys(keys: string[]): string[] {
  return keys.filter(isValidSkillKey);
}

export function getPrimaryCategories(): readonly HelperSkillCatalogEntry[] {
  return HELPER_SKILLS_CATALOG;
}

export function getSubsForPrimary(primaryId: string): readonly string[] {
  return HELPER_SKILLS_CATALOG.find((c) => c.id === primaryId)?.subs ?? [];
}

export function groupSkillKeysByPrimary(keys: string[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const key of keys) {
    const parsed = parseSkillKey(key);
    if (!parsed) continue;
    const list = map.get(parsed.primary) ?? [];
    list.push(key);
    map.set(parsed.primary, list);
  }
  const order = HELPER_SKILLS_CATALOG.map((c) => c.id);
  return new Map(order.filter((id) => map.has(id)).map((id) => [id, map.get(id)!]));
}

export function skillSubLabelKey(primary: string, sub: string): string {
  return `helper_skills.sub.${primary}.${sub}`;
}

export function skillPrimaryLabelKey(primary: string): string {
  return `helper_skills.primary.${primary}`;
}
