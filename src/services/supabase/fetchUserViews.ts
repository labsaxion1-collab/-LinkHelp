import { getSupabase } from '@/lib/supabase';
import type { MapperProfile, ProfileRow } from '@/types/database';

export function profileRowToMapper(p: ProfileRow): MapperProfile {
  return {
    name: p.name,
    avatar_url: p.avatar_url,
    rating: p.rating,
    jobs_completed: 0,
    plan_type: 'BASIC',
  };
}

export async function fetchProfilesAsMapperMap(ids: string[]): Promise<Map<string, MapperProfile>> {
  const sb = getSupabase();
  const map = new Map<string, MapperProfile>();
  if (!sb || ids.length === 0) return map;
  const unique = [...new Set(ids)];
  const { data, error } = await sb.from('profiles').select('id, name, avatar_url, rating').in('id', unique);
  if (error || !data) return map;
  for (const row of data as ProfileRow[]) {
    map.set(row.id, profileRowToMapper(row));
  }
  return map;
}
