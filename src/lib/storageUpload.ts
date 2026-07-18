import { getSupabase } from '@/lib/supabase';

export const STORAGE_BUCKETS = {
  avatars: 'avatars',
} as const;

const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'webp']);

function extFromFile(file: File, allowed: Set<string>): string | null {
  const mime = file.type.toLowerCase();
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  const dot = file.name.lastIndexOf('.');
  if (dot >= 0) {
    const raw = file.name.slice(dot + 1).toLowerCase();
    if (allowed.has(raw)) return raw === 'jpeg' ? 'jpg' : raw;
  }
  return null;
}

function assertSize(file: File, max: number, label: string) {
  if (file.size > max) {
    throw new Error(`FILE_TOO_LARGE:${label}`);
  }
}

/** Convert a canvas/data URL to a File for Storage upload. */
export async function fileFromDataUrl(dataUrl: string, fileName: string, mime = 'image/jpeg'): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], fileName, { type: blob.type || mime });
}

export function formatStorageError(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: string }).message);
  }
  return error instanceof Error ? error.message : String(error);
}

/** Upload avatar image; path `{uid}/avatar.{ext}` with upsert. */
export async function uploadAvatarImage(userId: string, file: File): Promise<{ path: string; publicUrl: string }> {
  const sb = getSupabase();
  if (!sb) throw new Error('NO_SUPABASE');
  assertSize(file, AVATAR_MAX_BYTES, 'avatar');
  const ext = extFromFile(file, IMAGE_EXT);
  if (!ext) throw new Error('INVALID_IMAGE_TYPE');
  const path = `${userId}/avatar.${ext}`;
  const { error } = await sb.storage.from(STORAGE_BUCKETS.avatars).upload(path, file, {
    upsert: true,
    contentType: file.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
  });
  if (error) throw error;
  const { data } = sb.storage.from(STORAGE_BUCKETS.avatars).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}
