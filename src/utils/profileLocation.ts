/** Region / state label from a profile row (e.g. QC). */
export function profileRegionFromRow(
  row: { region?: string | null } | null | undefined,
): string | null {
  const value = row?.region?.trim();
  return value || null;
}

export function profileLocationLabel(
  row: { city?: string | null; region?: string | null } | null | undefined,
): string {
  const region = profileRegionFromRow(row);
  return [row?.city?.trim(), region].filter(Boolean).join(', ');
}

/** Column sets for profiles queries — widest first; fall back if a column is missing in DB. */
export const PROFILE_HELPER_SELECT_COLUMNS = [
  'id, name, avatar_url, rating, bio, city, country, region',
  'id, name, avatar_url, rating, bio, city, country',
  'id, name, avatar_url, rating, bio, city',
] as const;

export function isMissingColumnError(message: string): boolean {
  return /column\s+.+\s+does not exist/i.test(message);
}
