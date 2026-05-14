/** Simple weighted score helper for future ranking / match features */
export function calculateScore(parts: { value: number; weight: number }[]): number {
  const w = parts.reduce((s, p) => s + p.weight, 0);
  if (w <= 0) return 0;
  return parts.reduce((s, p) => s + p.value * p.weight, 0) / w;
}
