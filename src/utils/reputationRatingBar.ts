/** Bar fill color for reputation score 0–5. */
export function getRatingBarColor(score: number): string {
  const value = Math.min(5, Math.max(0, score));
  if (value < 2) return '#EF4444';
  if (value < 3) return '#F97316';
  if (value < 4) return '#EAB308';
  if (value <= 4.5) return '#4ADE80';
  return '#16A34A';
}

export function ratingBarFillPercent(score: number): number {
  const value = Math.min(5, Math.max(0, score));
  return Math.round((value / 5) * 100);
}
