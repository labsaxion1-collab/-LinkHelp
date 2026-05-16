/** Subcategories that require origin/destination building access details (elevator, stairs, floors). */
export const MOVING_BUILDING_DETAIL_SUBKEYS = ['apartments', 'condominium', 'office_building'] as const;

export type MovingBuildingSubkey = (typeof MOVING_BUILDING_DETAIL_SUBKEYS)[number];

export function movingNeedsBuildingDetails(subKey: string): boolean {
  return (MOVING_BUILDING_DETAIL_SUBKEYS as readonly string[]).includes(subKey);
}
