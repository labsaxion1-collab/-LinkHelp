export function distanceBucket(km: number | null | undefined): string | null {
  if (km == null || !Number.isFinite(km)) return null;
  if (km <= 5) return '0-5';
  if (km <= 15) return '5-15';
  if (km <= 30) return '15-30';
  if (km <= 50) return '30-50';
  return '50+';
}
