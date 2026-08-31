import type { HelperBaseAddressValue } from '@/components/helper/HelperBaseAddressInput';
import type { ProfileRow } from '@/types/database';
import { helperHasExactBaseCoordinates } from '@/utils/helperBaseLocation';

export function helperBaseHasGpsConfirmation(value: HelperBaseAddressValue): boolean {
  return (
    typeof value.latitude === 'number' &&
    Number.isFinite(value.latitude) &&
    typeof value.longitude === 'number' &&
    Number.isFinite(value.longitude)
  );
}

export function helperBaseSyncPayload(value: HelperBaseAddressValue) {
  return {
    address: value.address.trim() || null,
    city: value.city.trim() || null,
    province: value.province.trim() || null,
    postalCode: value.postalCode.trim() || null,
    lat: value.latitude,
    lng: value.longitude,
  };
}

export function profileHasPersistedHomeCoordinates(
  profile: Pick<ProfileRow, 'helper_base_lat' | 'helper_base_lng'> | null | undefined,
): boolean {
  return helperHasExactBaseCoordinates(profile);
}
