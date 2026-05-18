import { filterValidSkillKeys, skillKey } from '@/data/helperSkillsCatalog';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import type { NearbyHelper } from '@/types/nearbyHelper';
import {
  isMissingColumnError,
  PROFILE_HELPER_SELECT_COLUMNS,
  profileRegionFromRow,
} from '@/utils/profileLocation';

type HelperProfileRow = {
  id: string;
  name: string | null;
  avatar_url: string | null;
  rating: number | null;
  bio: string | null;
  city: string | null;
  country?: string | null;
  region?: string | null;
  province?: string | null;
};

type HelperSkillRow = {
  helper_id: string;
  category: string;
  subcategory: string | null;
};

async function fetchHelperProfiles(sb: ReturnType<typeof getSupabase>, excludeUserId?: string) {
  if (!sb) return [] as HelperProfileRow[];

  for (const columns of PROFILE_HELPER_SELECT_COLUMNS) {
    let query = sb.from('profiles').select(columns).eq('role', 'helper');
    if (excludeUserId) query = query.neq('id', excludeUserId);

    const { data, error } = await query;
    if (!error) return (data ?? []) as HelperProfileRow[];
    if (isMissingColumnError(error.message)) continue;
    console.warn('[LinkHelp] fetchNearbyHelpers profiles', error.message);
    return [];
  }

  return [];
}

export async function fetchNearbyHelpers(excludeUserId?: string): Promise<NearbyHelper[]> {
  if (!isSupabaseConfigured()) return [];
  const sb = getSupabase();
  if (!sb) return [];

  const profiles = await fetchHelperProfiles(sb, excludeUserId);
  if (!profiles.length) return [];

  const ids = profiles.map((p) => p.id);
  const { data: skillRows, error: skillsErr } = await sb
    .from('helper_skills')
    .select('helper_id, category, subcategory')
    .in('helper_id', ids);

  if (skillsErr) console.warn('[LinkHelp] fetchNearbyHelpers skills', skillsErr.message);

  const skillsByHelper = new Map<string, string[]>();
  for (const row of (skillRows ?? []) as HelperSkillRow[]) {
    if (!row.subcategory) continue;
    const key = skillKey(row.category, row.subcategory);
    const list = skillsByHelper.get(row.helper_id) ?? [];
    list.push(key);
    skillsByHelper.set(row.helper_id, list);
  }

  return profiles.map((p) => ({
    id: p.id,
    name: p.name?.trim() || 'Helper',
    avatarUrl: p.avatar_url?.trim() || null,
    rating: p.rating ?? null,
    bio: p.bio?.trim() || null,
    city: p.city?.trim() || null,
    region: profileRegionFromRow(p),
    country: p.country?.trim() || null,
    skillIds: filterValidSkillKeys(skillsByHelper.get(p.id) ?? []),
    latitude: null,
    longitude: null,
    onlineStatus: null,
  }));
}
