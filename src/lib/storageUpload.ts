import { getSupabase } from '@/lib/supabase';

export const STORAGE_BUCKETS = {
  avatars: 'avatars',
  portfolioImages: 'portfolio-images',
  portfolioVideos: 'portfolio-videos',
} as const;

const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'webp']);
const VIDEO_EXT = new Set(['mp4', 'mov', 'webm']);

function extFromFile(file: File, allowed: Set<string>): string | null {
  const mime = file.type.toLowerCase();
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'video/mp4') return 'mp4';
  if (mime === 'video/quicktime') return 'mov';
  if (mime === 'video/webm') return 'webm';
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

export async function uploadPortfolioImageFile(userId: string, file: File): Promise<{ path: string; publicUrl: string }> {
  const sb = getSupabase();
  if (!sb) throw new Error('NO_SUPABASE');
  assertSize(file, 10 * 1024 * 1024, 'image');
  const ext = extFromFile(file, IMAGE_EXT);
  if (!ext) throw new Error('INVALID_IMAGE_TYPE');
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { data, error } = await sb.storage.from(STORAGE_BUCKETS.portfolioImages).upload(path, file, {
    contentType: file.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    upsert: false,
  });
  if (error) throw error;
  const objectPath = data?.path ?? path;
  const { data: pub } = sb.storage.from(STORAGE_BUCKETS.portfolioImages).getPublicUrl(objectPath);
  return { path: objectPath, publicUrl: pub.publicUrl };
}

/** Upload a JPEG thumbnail (e.g. video poster) into portfolio-images. */
export async function uploadPortfolioThumbFromDataUrl(
  userId: string,
  dataUrl: string,
): Promise<{ path: string; publicUrl: string }> {
  const file = await fileFromDataUrl(dataUrl, `thumb-${crypto.randomUUID()}.jpg`, 'image/jpeg');
  return uploadPortfolioImageFile(userId, file);
}

export async function uploadPortfolioVideoFile(userId: string, file: File): Promise<{ path: string; publicUrl: string }> {
  const sb = getSupabase();
  if (!sb) throw new Error('NO_SUPABASE');
  assertSize(file, 100 * 1024 * 1024, 'video');
  const ext = extFromFile(file, VIDEO_EXT);
  if (!ext) throw new Error('INVALID_VIDEO_TYPE');
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { data, error } = await sb.storage.from(STORAGE_BUCKETS.portfolioVideos).upload(path, file, {
    contentType: file.type || `video/${ext}`,
    upsert: false,
  });
  if (error) throw error;
  const objectPath = data?.path ?? path;
  const { data: pub } = sb.storage.from(STORAGE_BUCKETS.portfolioVideos).getPublicUrl(objectPath);
  return { path: objectPath, publicUrl: pub.publicUrl };
}

export async function removeStorageObjects(bucket: string, paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const sb = getSupabase();
  if (!sb) throw new Error('NO_SUPABASE');
  const { error } = await sb.storage.from(bucket).remove(paths);
  if (error) throw error;
}
