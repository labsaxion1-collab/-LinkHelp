import { getSupabase } from '@/lib/supabase';
import type { HelperPortfolioItemRow } from '@/types/database';
import type { PortfolioMediaItem } from '@/utils/helperPortfolioState';

function mapRow(row: HelperPortfolioItemRow): PortfolioMediaItem {
  return {
    id: row.id,
    kind: row.type === 'image' ? 'photo' : 'video',
    fileName: row.storage_path.split('/').pop() ?? 'media',
    caption: row.caption ?? undefined,
    skillId: row.skill_id ?? undefined,
    featured: row.featured,
    addedAt: new Date(row.created_at).getTime(),
    thumbDataUrl: row.thumb_url ?? undefined,
    durationSec: row.duration_sec ?? undefined,
    publicUrl: row.url,
    storagePath: row.storage_path,
    fullImageDataUrl: row.type === 'image' ? row.url : undefined,
  };
}

export async function fetchHelperPortfolioItems(helperId: string): Promise<PortfolioMediaItem[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from('helper_portfolio_items')
    .select('*')
    .eq('helper_id', helperId)
    .order('created_at', { ascending: true });
  if (error) {
    console.warn('[LinkHelp] fetchHelperPortfolioItems', error.message);
    return [];
  }
  return (data as HelperPortfolioItemRow[]).map(mapRow);
}

export async function insertHelperPortfolioItem(row: {
  helper_id: string;
  type: 'image' | 'video';
  url: string;
  storage_path: string;
  caption?: string | null;
  skill_id?: string | null;
  featured?: boolean;
  duration_sec?: number | null;
  thumb_url?: string | null;
  title?: string | null;
}): Promise<string> {
  const sb = getSupabase();
  if (!sb) throw new Error('NO_SUPABASE');
  const { data, error } = await sb
    .from('helper_portfolio_items')
    .insert({
      helper_id: row.helper_id,
      type: row.type,
      url: row.url,
      storage_path: row.storage_path,
      caption: row.caption ?? null,
      skill_id: row.skill_id ?? null,
      featured: row.featured ?? false,
      duration_sec: row.duration_sec ?? null,
      thumb_url: row.thumb_url ?? null,
      title: row.title ?? null,
    })
    .select('id')
    .single();
  if (error) {
    console.error('[LinkHelp] insertHelperPortfolioItem', error.message);
    throw new Error(error.message);
  }
  const id = (data as { id: string } | null)?.id;
  if (!id) throw new Error('INSERT_FAILED');
  return id;
}

export async function updateHelperPortfolioItemCaption(
  id: string,
  patch: { caption?: string | null; skill_id?: string | null; featured?: boolean },
): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.from('helper_portfolio_items').update(patch).eq('id', id);
  return !error;
}

export async function deleteHelperPortfolioItemRow(id: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.from('helper_portfolio_items').delete().eq('id', id);
  return !error;
}
