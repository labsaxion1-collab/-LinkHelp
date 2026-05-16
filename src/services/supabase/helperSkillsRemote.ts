import { getSupabase } from '@/lib/supabase';
import { filterValidSkillKeys, parseSkillKey, skillKey } from '@/data/helperSkillsCatalog';

type HelperSkillRow = {
  category: string;
  subcategory: string | null;
};

export async function fetchHelperSkills(helperId: string): Promise<string[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from('helper_skills')
    .select('category, subcategory')
    .eq('helper_id', helperId)
    .order('created_at', { ascending: true });
  if (error) {
    console.warn('[LinkHelp] fetchHelperSkills', error.message);
    return [];
  }
  const keys: string[] = [];
  for (const row of (data ?? []) as HelperSkillRow[]) {
    if (row.subcategory) {
      keys.push(skillKey(row.category, row.subcategory));
    }
  }
  return filterValidSkillKeys(keys);
}

/** Replace all helper skills with the selected subcategory keys (`primary:sub`). */
export async function syncHelperSkills(helperId: string, skillKeys: string[]): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error('NO_SUPABASE');

  const valid = filterValidSkillKeys(skillKeys);

  const { error: delErr } = await sb.from('helper_skills').delete().eq('helper_id', helperId);
  if (delErr) throw delErr;

  if (valid.length === 0) return;

  const rows = valid.map((key) => {
    const parsed = parseSkillKey(key)!;
    return {
      helper_id: helperId,
      category: parsed.primary,
      subcategory: parsed.sub,
    };
  });

  const { error: insErr } = await sb.from('helper_skills').insert(rows);
  if (insErr) throw insErr;
}
