import { getSupabase } from '@/lib/supabase';
import type { ProfileRow } from '@/types/database';

export class HelperBaseAddressLockedError extends Error {
  constructor() {
    super('HELPER_BASE_ADDRESS_LOCKED');
    this.name = 'HelperBaseAddressLockedError';
  }
}

export type HelperBaseAddressPayload = {
  address: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  lat: number | null;
  lng: number | null;
};

export async function syncHelperBaseAddress(payload: HelperBaseAddressPayload): Promise<ProfileRow> {
  const sb = getSupabase();
  if (!sb) throw new Error('NO_SUPABASE');

  const { data, error } = await sb.rpc('update_helper_base_address', {
    p_address: payload.address ?? '',
    p_city: payload.city ?? '',
    p_province: payload.province ?? '',
    p_postal_code: payload.postalCode ?? '',
    p_lat: payload.lat,
    p_lng: payload.lng,
  });

  if (error) {
    if (error.message.includes('HELPER_BASE_ADDRESS_LOCKED')) {
      throw new HelperBaseAddressLockedError();
    }
    throw error;
  }

  if (!data) throw new Error('HELPER_BASE_ADDRESS_NO_DATA');
  return data as ProfileRow;
}
