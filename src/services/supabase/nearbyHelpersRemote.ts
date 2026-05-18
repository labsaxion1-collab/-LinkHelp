import { filterValidSkillKeys, skillKey } from '@/data/helperSkillsCatalog';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import type { NearbyHelper } from '@/types/nearbyHelper';

type HelperProfileRow = {
  id: string;
  name: string | null;
  avatar_url: string | null;
  rating: number | null;
  bio: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
};

type HelperSkillRow = {
  helper_id: string;
  category: string;
  subcategory: string | null;
};

export async function fetchNearbyHelpers(excludeUserId?: string): Promise<NearbyHelper[]> {
  if (!isSupabaseConfigured()) return [];
  const sb = getSupabase();
  if (!sb) return [];

  let query = sb
    .from('profiles')
    .select('id, name, avatar_url, rating, bio, city, province, country')
    .eq('role', 'helper');

  if (excludeUserId) query = query.neq('id', excludeUserId);

  const { data: profiles, error } = await query;
  if (error) {
    console.warn('[LinkHelp] fetchNearbyHelpers profiles', error.message);
    return [];
  }
  if (!profiles?.length) return [];

  const ids = (profiles as HelperProfileRow[]).map((p) => p.id);
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

  return (profiles as HelperProfileRow[]).map((p) => ({
    id: p.id,
    name: p.name?.trim() || 'Helper',
    avatarUrl: p.avatar_url?.trim() || null,
    rating: p.rating ?? null,
    bio: p.bio?.trim() || null,
    city: p.city?.trim() || null,
    province: p.province?.trim() || null,
    country: p.country?.trim() || null,
    skillIds: filterValidSkillKeys(skillsByHelper.get(p.id) ?? []),
    latitude: null,
    longitude: null,
    onlineStatus: null,
  }));
}
