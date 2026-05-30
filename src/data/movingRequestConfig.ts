/** Subcategories that require origin/destination building access details (elevator, stairs, floors). */
export const MOVING_BUILDING_DETAIL_SUBKEYS = ['apartments', 'offices'] as const;

export type MovingBuildingSubkey = (typeof MOVING_BUILDING_DETAIL_SUBKEYS)[number];

export function movingNeedsBuildingDetails(subKey: string): boolean {
  return (MOVING_BUILDING_DETAIL_SUBKEYS as readonly string[]).includes(subKey);
}

/** Maps moving subcategory to legacy property type used in request descriptions. */
export function movingPropertyTypeFromSubKey(subKey: string): 'house' | 'apartment' | 'office' | 'business' | '' {
  if (subKey === 'houses' || subKey === 'long_distance' || subKey === 'small_moves') {
    return 'house';
  }
  if (subKey === 'apartments') return 'apartment';
  if (subKey === 'offices') return 'office';
  if (subKey === 'companies') return 'business';
  return '';
}
